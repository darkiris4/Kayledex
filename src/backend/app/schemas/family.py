from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class FamilyBase(BaseModel):
    name: str
    address: str | None = None
    contact_info: str | None = None


class FamilyCreate(FamilyBase):
    pass


class FamilyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    contact_info: str | None = None


class FamilyRead(FamilyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
