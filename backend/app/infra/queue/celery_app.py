from celery import Celery

from app.core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "career_path_ai",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_default_queue="career_path_ai",
    task_track_started=True,
    imports=("app.tasks.generate_career_path",),
)

celery_app.autodiscover_tasks(["app.tasks"])