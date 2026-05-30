from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./tigbourne.db"
    cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "change-me-in-prod"
    jwt_expire_minutes: int = 60 * 24 * 7
    jwt_algorithm: str = "HS256"

    frontend_data_dir: str = "../oilfield-platform/src/data"

    google_sheet_id: Optional[str] = None
    google_service_account_file: str = "service-account.json"
    ingest_secret: str = "change-me-ingest-secret"

    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_individual: Optional[str] = None
    stripe_price_institutional: Optional[str] = None
    frontend_base_url: str = "http://localhost:5173"

    price_api_url: Optional[str] = None

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
