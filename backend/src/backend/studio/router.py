import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
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
        generation_status=output.generation_status,
        generation_progress=output.generation_progress,
        generation_error=output.generation_error,
    )


@router.post(
    "/notebooks/{notebook_id}/studio/mindmap/generate",
    response_model=MindMapResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_mindmap(
    notebook_id: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> MindMapResponse:
    """Start mindmap generation in the background.

    Returns immediately with a pending task. Poll GET /mindmap to check status.
    """
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    task = await service.create_mindmap_task(session, notebook)

    background_tasks.add_task(
        service.generate_mindmap_background,
        task.id,
        notebook.id,
        notebook.name,
        notebook.llm_provider,
        notebook.llm_model,
    )

    return MindMapResponse(
        id=task.id,
        notebook_id=task.notebook_id,
        title=task.title,
        data=MindMapData(**json.loads(task.data)),
        created_at=task.created_at,
        generation_status=task.generation_status,
        generation_progress=task.generation_progress,
        generation_error=task.generation_error,
    )
