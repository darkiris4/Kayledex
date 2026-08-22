from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict

from app.models.settings import TimeTrackingMode


class SettingsUpdate(BaseModel):
    time_tracking_mode: TimeTrackingMode | None = None
    curriculum_tracking_enabled: bool | None = None
    active_grade_scale_id: uuid.UUID | None = None
    report_branding_logo_path: str | None = None
    report_footer_text: str | None = None
    parent_educator_name: str | None = None


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    time_tracking_mode: TimeTrackingMode
    curriculum_tracking_enabled: bool
    active_grade_scale_id: uuid.UUID | None
    report_branding_logo_path: str | None
    report_footer_text: str | None
    parent_educator_name: str | None
