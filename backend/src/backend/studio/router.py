import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import get_session
from src.backend.notebooks.service import get_notebook
from src.backend.studio import service
from src.backend.studio.schemas import MindMapData, MindMapResponse

router = APIRouter(prefix="/api", tags=["studio"])


@router.get(
    "/notebooks/{notebook_id}/studio/mindmap",
    response_model=MindMapResponse | None,
)
async def get_mindmap(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> MindMapResponse | None:
    """Get the latest mindmap for a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    output = await service.get_mindmap(session, notebook_id)
    if not output:
        return None

    return MindMapResponse(
        id=output.id,
        notebook_id=output.notebook_id,
        title=output.title,
        data=MindMapData(**json.loads(output.data)),
        created_at=output.created_at,
    )


@router.post(
    "/notebooks/{notebook_id}/studio/mindmap/generate",
    response_model=MindMapResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_mindmap(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> MindMapResponse:
    """Generate a new mindmap for a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    output = await service.generate_mindmap(session, notebook)

    return MindMapResponse(
        id=output.id,
        notebook_id=output.notebook_id,
        title=output.title,
        data=MindMapData(**json.loads(output.data)),
        created_at=output.created_at,
    )
