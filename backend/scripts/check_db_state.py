from app.infra.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
cols = db.execute(text(
    "SELECT column_name FROM information_schema.columns"
    " WHERE table_name='users' AND column_name IN ('current_streak','longest_streak','last_activity_date')"
)).fetchall()
table = db.execute(text(
    "SELECT 1 FROM information_schema.tables WHERE table_name='daily_activity_logs'"
)).fetchone()
enum_type = db.execute(text(
    "SELECT 1 FROM pg_type WHERE typname='daily_objective_type'"
)).fetchone()
alembic_ver = db.execute(text("SELECT version_num FROM alembic_version")).fetchall()
print("User cols:", [r[0] for r in cols])
print("daily_activity_logs table:", bool(table))
print("daily_objective_type enum:", bool(enum_type))
print("alembic versions:", [r[0] for r in alembic_ver])
db.close()
