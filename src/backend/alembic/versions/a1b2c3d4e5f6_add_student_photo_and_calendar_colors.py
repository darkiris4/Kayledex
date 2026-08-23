"""add student photo_path and settings calendar_status_colors

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-08-23 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('photo_path', sa.String(length=500), nullable=True))
    op.add_column('settings', sa.Column('calendar_status_colors', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('settings', 'calendar_status_colors')
    op.drop_column('students', 'photo_path')
