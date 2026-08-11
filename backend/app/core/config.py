from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://avighnya:avighnya@localhost:5432/avighnya"
    secret_key: str = "change-me-in-production-avighnya-foods-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
