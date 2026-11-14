import React, { useEffect, useRef, useState } from 'react';
import { CorrelationGraphNode, CorrelationGraphEdge } from '../services/types';
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';

interface CorrelationGraphProps {
  nodes: CorrelationGraphNode[];
  edges: CorrelationGraphEdge[];
  height?: number;
}

interface SimNode extends CorrelationGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const CorrelationGraph: React.FC<CorrelationGraphProps> = ({ nodes, edges, height = 360 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<SimNode | null>(null);

  // Initialize node physics and colors
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 600;
    const canvasHeight = height;

    const getColor = (node: CorrelationGraphNode): { color: string; radius: number } => {
      if (node.type === 'current_scan') {
        return { color: '#00f2fe', radius: 22 };
      }
      if (node.type === 'related_scan') {
        switch (node.risk_level) {
          case 'Critical': return { color: '#ef4444', radius: 18 };
          case 'High': return { color: '#f97316', radius: 18 };
          case 'Medium': return { color: '#f59e0b', radius: 18 };
          default: return { color: '#10b981', radius: 16 };
        }
      }
      if (node.type.startsWith('indicator_domain') || node.type.startsWith('indicator_root')) {
        return { color: '#818cf8', radius: 15 };
      }
      if (node.type.startsWith('indicator_phone')) {
        return { color: '#34d399', radius: 14 };
      }
      return { color: '#38bdf8', radius: 14 };
    };

    // Arrange nodes in an organic circle or spread
    const centerX = width / 2;
    const centerY = canvasHeight / 2;
    const simNodes: SimNode[] = nodes.map((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
      const dist = n.type === 'current_scan' ? 0 : 90 + (i % 3) * 35;
      const { color, radius } = getColor(n);
      return {
        ...n,
        x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius,
        color,
      };
    });

    simNodesRef.current = simNodes;

    // Simulation loop
    let ticks = 0;
    const simulate = () => {
      const currentNodes = simNodesRef.current;
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));

      // Physics: Repulsion between all nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 40;
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.12;
            if (a !== draggedNodeRef.current) {
              a.x -= dx * force;
              a.y -= dy * force;
            }
            if (b !== draggedNodeRef.current) {
              b.x += dx * force;
              b.y += dy * force;
            }
          }
        }
      }

      // Physics: Spring attraction along edges
      edges.forEach((e) => {
        const source = nodeMap.get(e.source);
        const target = nodeMap.get(e.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 95;
          const force = (dist - targetDist) * 0.04;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (source !== draggedNodeRef.current && source.type !== 'current_scan') {
            source.x += fx;
            source.y += fy;
          }
          if (target !== draggedNodeRef.current) {
            target.x -= fx;
            target.y -= fy;
          }
        }
      });

      // Bounds constraint
      currentNodes.forEach((n) => {
        n.x = Math.max(n.radius + 10, Math.min(width - n.radius - 10, n.x));
        n.y = Math.max(n.radius + 10, Math.min(canvasHeight - n.radius - 10, n.y));
      });

      // Render onto canvas
      renderCanvas();

      ticks++;
      if (ticks < 200 || isDraggingRef.current) {
        animFrameRef.current = requestAnimationFrame(simulate);
      }
    };

    const renderCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, canvasHeight);

      const nodeMap = new Map(simNodesRef.current.map((n) => [n.id, n]));

      // 1. Draw Edges
      edges.forEach((e) => {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = e.type === 'shared_indicator' ? 'rgba(0, 242, 254, 0.45)' : 'rgba(100, 116, 139, 0.25)';
          ctx.lineWidth = e.type === 'shared_indicator' ? 2 : 1;
          if (e.type === 'shared_indicator') {
            ctx.setLineDash([4, 3]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw mid-edge label if shared
          if (e.type === 'shared_indicator') {
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(midX - 22, midY - 8, 44, 16);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SHARED', midX, midY);
          }
        }
      });

      // 2. Draw Nodes
      simNodesRef.current.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        const isCurrent = n.type === 'current_scan';

        // Outer glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isHovered ? 6 : 2), 0, 2 * Math.PI);
        ctx.fillStyle = isCurrent ? 'rgba(0, 242, 254, 0.2)' : `${n.color}25`;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#0a0f1d';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = isCurrent ? 3 : 2;
        ctx.stroke();

        // Inner circle dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Label below node
        ctx.fillStyle = '#e2e8f0';
        ctx.font = isCurrent ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayLabel = n.label.length > 22 ? n.label.slice(0, 20) + '...' : n.label;
        ctx.fillText(displayLabel, n.x, n.y + n.radius + 4);
      });
    };

    animFrameRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, edges, height]);

  // Handle Drag & Hover
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clicked = simNodesRef.current.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clicked) {
      isDraggingRef.current = true;
      draggedNodeRef.current = clicked;
      setSelectedNode(clicked);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      draggedNodeRef.current.x = mouseX;
      draggedNodeRef.current.y = mouseY;
    } else {
      const hover = simNodesRef.current.find((n) => {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
      });
      setHoveredNode(hover || null);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white">Cross-Channel Threat Relationship Topology</h4>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400"></span> Active Submission
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400"></span> Shared Indicator
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400"></span> Related Threat
          </span>
        </div>
      </div>

      <div className="relative border border-slate-800/80 rounded-lg bg-navy-950/90 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full cursor-grab active:cursor-grabbing block"
          style={{ height: `${height}px` }}
        />

        {/* Selected Node Details Card Overlay */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 max-w-xs p-3 rounded-lg bg-navy-900/95 border border-cyan-500/40 text-xs shadow-lg backdrop-blur-md animate-fadeIn">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] uppercase text-cyan-400">
                {selectedNode.type.replace('_', ' ')}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-white break-words mb-1">
              {selectedNode.label}
            </div>
            {selectedNode.details && (
              <div className="text-slate-300 text-[11px] mb-1">
                {selectedNode.details}
              </div>
            )}
            {selectedNode.risk_level && (
              <div className="text-[11px] text-slate-400 font-mono">
                Risk Status: <span className="text-white font-semibold">{selectedNode.risk_level}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-right">
        <span className="text-[11px] text-slate-500 font-mono">
          Drag nodes to inspect topology • Hover for details
        </span>
      </div>
    </div>
  );
};
