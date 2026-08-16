import uuid

from app.infra.queue.celery_app import celery_app
from app.services.path_generation_service import generate_career_path as generate_career_path_service


@celery_app.task(name="generate_career_path")
def generate_career_path_task(career_path_id: str) -> None:
    generate_career_path_service(uuid.UUID(career_path_id))