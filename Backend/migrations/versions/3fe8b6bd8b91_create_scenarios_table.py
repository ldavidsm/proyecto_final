"""create scenarios table

Revision ID: 123456789abc
Revises: <id_revision_anterior>
Create Date: 2025-08-23 12:00:00

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '123456789abc'
down_revision = '12ce532bbee3'  # 👉 reemplaza con la última revisión
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scenarios', sa.Column('description', sa.Text, nullable=True))
    op.add_column('scenarios', sa.Column('scenario_type', sa.String(50), nullable=False, server_default="base"))
    op.add_column('scenarios', sa.Column('data_snapshot', sa.JSON, nullable=True))
    op.add_column('scenarios', sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()))
    op.add_column('scenarios', sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()))




def downgrade():
    op.drop_column('scenarios', 'updated_at')
    op.drop_column('scenarios', 'created_at')
    op.drop_column('scenarios', 'data_snapshot')
    op.drop_column('scenarios', 'scenario_type')
    op.drop_column('scenarios', 'description')