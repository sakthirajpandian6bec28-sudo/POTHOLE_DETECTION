from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    MODEL_PATH: str = "models/best.pt"
    CONFIDENCE_THRESHOLD: float = 0.45
    IOU_THRESHOLD: float = 0.45

    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_FILE_TYPES: str = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"

    SEVERITY_LOW_MAX: float = 0.02
    SEVERITY_MEDIUM_MAX: float = 0.08

    CORS_ORIGINS: str = "*"
    DATABASE_URL: str = "sqlite:///./potholes.db"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ft.strip() for ft in self.ALLOWED_FILE_TYPES.split(",") if ft.strip()]

    @property
    def resolved_model_path(self) -> Path:
        base_dir = Path(__file__).resolve().parent.parent.parent
        model_path = Path(self.MODEL_PATH)
        if model_path.is_absolute():
            return model_path
        return base_dir / model_path


settings = Settings()
