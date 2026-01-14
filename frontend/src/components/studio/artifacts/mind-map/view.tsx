"use client";

import { useMemo, useRef, useCallback } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Position,
  ConnectionMode,
  Background,
  Controls,
  Panel,
  type NodeMouseHandler,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { Download, X, RefreshCw, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MindMapData } from "@/types/api";
import { useNotebookActions } from "@/stores/notebook-store";
import type { ArtifactViewProps } from "../types";

import "@xyflow/react/dist/style.css";

const NODE_CLASSES = {
  central:
    "bg-primary text-on-primary rounded-xl px-5 py-3 font-semibold text-sm min-w-[200px]",
  main: "bg-primary-muted text-on-primary-muted rounded-lg px-4 py-2 font-medium text-[13px] min-w-[150px]",
  child:
    "bg-surface-variant text-on-surface border border-border rounded-md px-3 py-1.5 text-xs min-w-[130px]",
  grandchild:
    "bg-surface text-on-surface-muted border border-border-muted rounded px-2.5 py-1 text-[11px] min-w-[110px]",
} as const;

const EDGE_STYLES = {
  central: { stroke: "var(--color-primary)", strokeWidth: 2 },
  main: { stroke: "var(--color-border)", strokeWidth: 1.5 },
  child: {
    stroke: "var(--color-border-muted)",
    strokeWidth: 1,
    strokeDasharray: "4 2",
  },
} as const;

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
    className: NODE_CLASSES.central,
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
      className: NODE_CLASSES.main,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    edges.push({
      id: `central-${node.id}`,
      source: "central",
      target: node.id,
      style: EDGE_STYLES.central,
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
          className: NODE_CLASSES.child,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        edges.push({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          style: EDGE_STYLES.main,
          type: "smoothstep",
        });

        if (child.children?.length) {
          const gcStartY = childY - ((child.children.length - 1) * 42) / 2;
          child.children.forEach((gc, gcIndex) => {
            nodes.push({
              id: gc.id,
              position: { x: childX + 160, y: gcStartY + gcIndex * 42 },
              data: { label: gc.label },
              className: NODE_CLASSES.grandchild,
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });
            edges.push({
              id: `${child.id}-${gc.id}`,
              source: child.id,
              target: gc.id,
              style: EDGE_STYLES.child,
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
}: ArtifactViewProps<MindMapData>) {
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useMemo(() => buildNodesAndEdges(data), [data]);
  const { askInChat } = useNotebookActions();

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const label = node.data?.label as string | undefined;
      if (label) {
        askInChat(`Tell me more about "${label}" based on my sources.`);
        onClose();
      }
    },
    [askInChat, onClose],
  );

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
          elementsSelectable={true}
          onNodeClick={handleNodeClick}
          panOnDrag
          zoomOnScroll
          preventScrolling
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <Panel
            position="bottom-center"
            className="flex items-center gap-3 text-xs text-on-surface-muted"
          >
            <span>Scroll to zoom • Drag to pan</span>
            <span className="flex items-center gap-1 rounded-full bg-primary-muted px-2 py-1 text-on-primary-muted">
              <MessageCircle className="h-3 w-3" />
              Click any node to ask about it
            </span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
