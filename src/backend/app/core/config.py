from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    attachments_dir: str = "/data/attachments"


settings = Settings()
