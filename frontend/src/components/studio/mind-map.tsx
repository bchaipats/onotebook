"use client";

import { useMemo, useRef } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Position,
  ConnectionMode,
  Background,
  Controls,
  Panel,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { Download, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MindMapData } from "@/types/api";

import "@xyflow/react/dist/style.css";

interface MindMapViewProps {
  data: MindMapData;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function buildNodesAndEdges(data: MindMapData): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "central",
    position: { x: 0, y: 0 },
    data: { label: data.central_topic },
    style: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
      border: "none",
      borderRadius: "12px",
      padding: "12px 20px",
      fontWeight: 600,
      fontSize: "14px",
      minWidth: 200,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const startY = -((data.nodes.length - 1) * 90) / 2;

  data.nodes.forEach((node, index) => {
    const mainY = startY + index * 90;
    const mainX = 200;

    nodes.push({
      id: node.id,
      position: { x: mainX, y: mainY },
      data: { label: node.label },
      style: {
        background: "var(--color-primary-muted)",
        color: "var(--color-on-primary-muted)",
        border: "none",
        borderRadius: "8px",
        padding: "8px 16px",
        fontWeight: 500,
        fontSize: "13px",
        minWidth: 150,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    edges.push({
      id: `central-${node.id}`,
      source: "central",
      target: node.id,
      style: { stroke: "var(--color-primary)", strokeWidth: 2 },
      type: "smoothstep",
    });

    if (node.children?.length) {
      const childStartY = mainY - ((node.children.length - 1) * 60) / 2;

      node.children.forEach((child, childIndex) => {
        const childY = childStartY + childIndex * 60;
        const childX = mainX + 200;

        nodes.push({
          id: child.id,
          position: { x: childX, y: childY },
          data: { label: child.label },
          style: {
            background: "var(--color-surface-variant)",
            color: "var(--color-on-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            padding: "6px 12px",
            fontSize: "12px",
            minWidth: 130,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        edges.push({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          style: { stroke: "var(--color-border)", strokeWidth: 1.5 },
          type: "smoothstep",
        });

        if (child.children?.length) {
          const gcStartY = childY - ((child.children.length - 1) * 42) / 2;
          child.children.forEach((gc, gcIndex) => {
            nodes.push({
              id: gc.id,
              position: { x: childX + 160, y: gcStartY + gcIndex * 42 },
              data: { label: gc.label },
              style: {
                background: "var(--color-surface)",
                color: "var(--color-on-surface-muted)",
                border: "1px solid var(--color-border-muted)",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "11px",
                minWidth: 110,
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });
            edges.push({
              id: `${child.id}-${gc.id}`,
              source: child.id,
              target: gc.id,
              style: {
                stroke: "var(--color-border-muted)",
                strokeWidth: 1,
                strokeDasharray: "4 2",
              },
              type: "smoothstep",
            });
          });
        }
      });
    }
  });

  return { nodes, edges };
}

export function MindMapView({
  data,
  onClose,
  onRegenerate,
  isRegenerating,
}: MindMapViewProps) {
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useMemo(() => buildNodesAndEdges(data), [data]);

  async function handleDownload() {
    if (!reactFlowRef.current) return;
    try {
      const dataUrl = await toPng(reactFlowRef.current, {
        backgroundColor: "white",
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `mindmap-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Download failed silently
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <h2 className="font-semibold text-on-surface">
          Mind Map: {data.central_topic}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PNG
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1" ref={reactFlowRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          preventScrolling
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <Panel
            position="bottom-center"
            className="text-xs text-on-surface-muted"
          >
            Scroll to zoom • Drag to pan
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
