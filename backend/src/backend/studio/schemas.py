from datetime import datetime

from pydantic import BaseModel


class MindMapNode(BaseModel):
    id: str
    label: str
    children: list["MindMapNode"] = []


class MindMapData(BaseModel):
    central_topic: str
    nodes: list[MindMapNode]


class MindMapResponse(BaseModel):
    id: str
    notebook_id: str
    title: str | None
    data: MindMapData
    created_at: datetime

    model_config = {"from_attributes": True}


class StudioOutputResponse(BaseModel):
    id: str
    notebook_id: str
    output_type: str
    title: str | None
    data: str  # JSON string
    created_at: datetime

    model_config = {"from_attributes": True}
