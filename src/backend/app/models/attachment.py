from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class AttachmentAssociationType(str, enum.Enum):
    instruction_record = "instruction_record"
    assessment = "assessment"


class Attachment(Base, UUIDPKMixin, TimestampMixin):
    """Polymorphic association by (type, id) rather than a foreign key, since a single
    FK can't target two different tables. Validated at the API layer instead.
    """

    __tablename__ = "attachments"

    filename: Mapped[str] = mapped_column(String(255))
    storage_path: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(100))
    associated_type: Mapped[AttachmentAssociationType] = mapped_column(
        Enum(AttachmentAssociationType, name="attachment_association_type")
    )
    associated_id: Mapped[uuid.UUID]
