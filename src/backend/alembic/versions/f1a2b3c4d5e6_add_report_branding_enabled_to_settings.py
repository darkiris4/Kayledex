"""add report_branding_enabled to settings

Revision ID: f1a2b3c4d5e6
Revises: ddec205db818
Create Date: 2026-08-22 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'ddec205db818'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'settings',
        sa.Column('report_branding_enabled', sa.Boolean(), server_default='true', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('settings', 'report_branding_enabled')
