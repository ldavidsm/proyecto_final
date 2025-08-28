"""create scenarios table

Revision ID: ffa2d9923edd
Revises: 123456789abc
Create Date: 2025-08-23 12:48:04.411305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffa2d9923edd'
down_revision: Union[str, Sequence[str], None] = '123456789abc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
