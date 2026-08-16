from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Career Path AI Backend"
    app_version: str = "0.1.0"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    stripe_api_key: str | None = Field(default=None, alias="STRIPE_API_KEY")
    stripe_webhook_secret: str | None = Field(default=None, alias="STRIPE_WEBHOOK_SECRET")
    mercado_pago_access_token: str | None = Field(default=None, alias="MERCADO_PAGO_ACCESS_TOKEN")
    mercado_pago_webhook_secret: str | None = Field(
        default=None,
        alias="MERCADO_PAGO_WEBHOOK_SECRET",
    )
    auth0_domain: str | None = Field(default=None, alias="AUTH0_DOMAIN")
    auth0_audience: str | None = Field(default=None, alias="AUTH0_AUDIENCE")
    clerk_secret_key: str | None = Field(default=None, alias="CLERK_SECRET_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()