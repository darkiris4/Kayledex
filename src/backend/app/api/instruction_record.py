import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.attachment import delete_attachments_for
from app.core.db import get_db
from app.models import AttachmentAssociationType, InstructionRecord
from app.schemas.instruction_record import (
    InstructionRecordCreate,
    InstructionRecordRead,
    InstructionRecordUpdate,
)

router = APIRouter(prefix="/api/instruction-records", tags=["instruction-records"])


@router.get("", response_model=list[InstructionRecordRead])
def list_instruction_records(
    school_day_id: uuid.UUID | None = None, db: Session = Depends(get_db)
):
    query = db.query(InstructionRecord)
    if school_day_id is not None:
        query = query.filter(InstructionRecord.school_day_id == school_day_id)
    return query.all()


@router.post("", response_model=InstructionRecordRead, status_code=201)
def create_instruction_record(payload: InstructionRecordCreate, db: Session = Depends(get_db)):
    record = InstructionRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=InstructionRecordRead)
def get_instruction_record(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.get(InstructionRecord, record_id)
    if not record:
        raise HTTPException(404, "Instruction record not found")
    return record


@router.patch("/{record_id}", response_model=InstructionRecordRead)
def update_instruction_record(
    record_id: uuid.UUID, payload: InstructionRecordUpdate, db: Session = Depends(get_db)
):
    record = db.get(InstructionRecord, record_id)
    if not record:
        raise HTTPException(404, "Instruction record not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
def delete_instruction_record(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.get(InstructionRecord, record_id)
    if not record:
        raise HTTPException(404, "Instruction record not found")
    delete_attachments_for(AttachmentAssociationType.instruction_record, record_id, db)
    db.delete(record)
    db.commit()
