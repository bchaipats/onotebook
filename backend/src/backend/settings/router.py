from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import get_session
from src.backend.settings import service
from src.backend.settings.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(
    session: AsyncSession = Depends(get_session),
) -> SettingsResponse:
    """Get all application settings."""
    settings = await service.get_all_settings(session)
    return SettingsResponse(**settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    updates: SettingsUpdate,
    session: AsyncSession = Depends(get_session),
) -> SettingsResponse:
    """Update application settings."""
    update_dict = updates.model_dump(exclude_unset=True)
    settings = await service.update_settings(session, update_dict)
    return SettingsResponse(**settings)
