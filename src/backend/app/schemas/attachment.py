from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict

from app.models.attachment import AttachmentAssociationType


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    content_type: str
    associated_type: AttachmentAssociationType
    associated_id: uuid.UUID
