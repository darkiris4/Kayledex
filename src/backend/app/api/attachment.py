import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import Assessment, Attachment, AttachmentAssociationType, InstructionRecord
from app.schemas.attachment import AttachmentRead

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

# Photos/scans/PDFs cover the real use case (a photographed worksheet, a scanned
# assignment). The on-disk extension is derived from this map, never from the
# client-supplied filename, so a mislabeled upload can't land on disk with an
# attacker-chosen extension (spec section 37: secure file handling).
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def _validate_associated_record(
    associated_type: AttachmentAssociationType, associated_id: uuid.UUID, db: Session
) -> None:
    model = InstructionRecord if associated_type == AttachmentAssociationType.instruction_record else Assessment
    if not db.get(model, associated_id):
        raise HTTPException(404, f"{associated_type.value.replace('_', ' ').title()} not found")


@router.get("", response_model=list[AttachmentRead])
def list_attachments(
    associated_type: AttachmentAssociationType,
    associated_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return (
        db.query(Attachment)
        .filter(Attachment.associated_type == associated_type, Attachment.associated_id == associated_id)
        .all()
    )


@router.post("", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    associated_type: AttachmentAssociationType = Form(...),
    associated_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _validate_associated_record(associated_type, associated_id, db)

    ext = CONTENT_TYPE_EXTENSIONS.get(file.content_type or "")
    if ext is None:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "File too large (max 10 MB)")

    storage_dir = Path(settings.attachments_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    (storage_dir / stored_name).write_bytes(contents)

    attachment = Attachment(
        filename=file.filename or stored_name,
        storage_path=stored_name,
        content_type=file.content_type,
        associated_type=associated_type,
        associated_id=associated_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(attachment_id: uuid.UUID, db: Session = Depends(get_db)):
    attachment = db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")
    file_path = Path(settings.attachments_dir) / attachment.storage_path
    if not file_path.is_file():
        raise HTTPException(410, "File no longer exists on disk")
    return FileResponse(file_path, media_type=attachment.content_type, filename=attachment.filename)


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: uuid.UUID, db: Session = Depends(get_db)):
    attachment = db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")
    file_path = Path(settings.attachments_dir) / attachment.storage_path
    file_path.unlink(missing_ok=True)
    db.delete(attachment)
    db.commit()


def delete_attachments_for(
    associated_type: AttachmentAssociationType, associated_id: uuid.UUID, db: Session
) -> None:
    """Call this from any endpoint that deletes an InstructionRecord or Assessment —
    Attachment has no FK to either (it's a polymorphic association), so nothing
    cascades automatically and orphaned files would otherwise sit on disk forever.
    """
    attachments = (
        db.query(Attachment)
        .filter(Attachment.associated_type == associated_type, Attachment.associated_id == associated_id)
        .all()
    )
    for attachment in attachments:
        (Path(settings.attachments_dir) / attachment.storage_path).unlink(missing_ok=True)
        db.delete(attachment)
