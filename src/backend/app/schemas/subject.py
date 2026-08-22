from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class SubjectBase(BaseModel):
    family_id: uuid.UUID
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    active: bool = True


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    active: bool | None = None


class SubjectRead(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
