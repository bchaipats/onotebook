"""Settings service for persistent user preferences."""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.config import settings as app_settings
from src.backend.models import Setting


DEFAULT_SETTINGS = {
    "theme": "system",
    "default_model": app_settings.default_llm_model,
    "ollama_url": app_settings.ollama_base_url,
    "top_k": 5,
    "temperature": 0.7,
}


async def get_all_settings(session: AsyncSession) -> dict:
    """Get all settings, using defaults for missing values."""
    stmt = select(Setting)
    result = await session.execute(stmt)
    settings_list = result.scalars().all()

    # Start with defaults
    current = DEFAULT_SETTINGS.copy()

    # Override with stored values
    for setting in settings_list:
        try:
            current[setting.key] = json.loads(setting.value)
        except json.JSONDecodeError:
            current[setting.key] = setting.value

    return current


async def update_setting(session: AsyncSession, key: str, value) -> None:
    """Update a single setting."""
    stmt = select(Setting).where(Setting.key == key)
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()

    json_value = json.dumps(value)

    if setting:
        setting.value = json_value
    else:
        setting = Setting(key=key, value=json_value)
        session.add(setting)

    await session.commit()


async def update_settings(session: AsyncSession, updates: dict) -> dict:
    """Update multiple settings at once."""
    for key, value in updates.items():
        if value is not None:
            await update_setting(session, key, value)

    return await get_all_settings(session)
