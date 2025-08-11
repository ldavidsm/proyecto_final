"""Eliminar columna username de usuario

Revision ID: a08478256408
Revises: b6d7ba278f60
Create Date: 2025-07-07 13:16:15.815047

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a08478256408'
down_revision = 'e37719f81ff4'
branch_labels = None
depends_on = None


def upgrade():
     op.drop_column('usuario', 'username')


def downgrade():
    op.add_column('usuario', sa.Column('username', sa.String(length=120), nullable=True))
