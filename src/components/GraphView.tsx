import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { InvestigationResult, GraphNode, NodeType } from '../types/osint';
import { useTheme } from '../utils/theme';
import { ExternalLink, X, RotateCcw } from 'lucide-react';

interface GraphViewProps {
  result: InvestigationResult;
}

export const GraphView: React.FC<GraphViewProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(new Set());

  // Filter types available in current graph
  const availableTypes = useMemo(() => {
    const types = new Set<NodeType>();
    result.graph.nodes.forEach((n) => types.add(n.type));
    return Array.from(types);
  }, [result]);

  const toggleFilter = (type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Restrained node color scheme
  const getNodeColor = (type: NodeType, isTarget: boolean) => {
    if (isTarget) {
      return {
        bg: isDark ? '#1E293B' : '#EFF6FF',
        border: isDark ? '#3B82F6' : '#2563EB',
        text: isDark ? '#FFFFFF' : '#1E3A8A',
      };
    }
    return {
      bg: isDark ? '#17181A' : '#FFFFFF',
      border: isDark ? '#2E3136' : '#DDDDD8',
      text: isDark ? '#E4E4E7' : '#18181B',
    };
  };

  // Convert OSINT graph nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    const rawNodes = result.graph.nodes;
    const count = rawNodes.length;
    const centerX = 400;
    const centerY = 300;
    const radius = Math.max(180, count * 28);

    return rawNodes.map((n, idx) => {
      let x = centerX;
      let y = centerY;
      const isTarget = n.type === 'TARGET';

      if (!isTarget) {
        const angle = (idx / Math.max(1, count - 1)) * 2 * Math.PI;
        x = centerX + Math.cos(angle) * (radius + (idx % 2 === 0 ? 0 : 40));
        y = centerY + Math.sin(angle) * (radius + (idx % 2 === 0 ? 0 : 40));
      }

      const colors = getNodeColor(n.type, isTarget);
      const isHidden = activeFilters.size > 0 && !activeFilters.has(n.type);

      return {
        id: n.id,
        position: n.position || { x, y },
        hidden: isHidden,
        data: {
          label: (
            <div className="text-left py-0.5 px-1.5 leading-tight">
              <div className="text-[10px] opacity-60 uppercase font-sans font-medium">
                {n.type.toLowerCase()}
              </div>
              <div className="text-xs font-medium truncate max-w-[150px]">
                {n.label}
              </div>
            </div>
          ),
          raw: n,
        },
        style: {
          background: colors.bg,
          borderColor: colors.border,
          borderWidth: isTarget ? '2px' : '1px',
          color: colors.text,
          borderRadius: '6px',
          padding: '4px',
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.08)',
          cursor: 'pointer',
        },
      };
    });
  }, [result, activeFilters, isDark]);

  const initialEdges: Edge[] = useMemo(() => {
    return result.graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: {
        stroke: isDark ? '#3F3F46' : '#A1A1AA',
        strokeWidth: 1.2,
      },
      labelStyle: {
        fill: isDark ? '#A1A1AA' : '#52525B',
        fontSize: 10,
        fontFamily: 'sans-serif',
      },
      labelBgStyle: {
        fill: isDark ? '#111214' : '#FFFFFF',
        fillOpacity: 0.9,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: isDark ? '#52525B' : '#A1A1AA',
      },
    }));
  }, [result, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.data?.raw) {
      setSelectedNode(node.data.raw as GraphNode);
    }
  }, []);

  return (
    <div className="space-y-4" id="graph-view-container">
      {/* Top Filter & Count Bar */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Filter by type:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableTypes.map((type) => {
              const isSelected = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
                  }`}
                >
                  {type.toLowerCase()}
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-xs text-blue-500 hover:underline px-1.5 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div
          className={`text-xs ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          <span>{result.graph.nodes.length} verified nodes</span>
          <span className="mx-2">·</span>
          <span>{result.graph.edges.length} connections</span>
        </div>
      </div>

      {/* Graph Area */}
      <div
        className={`relative w-full h-[580px] rounded-xl border overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0B0B0C] border-[#222428]'
            : 'bg-[#F9F9F8] border-[#DDDDD8]'
        }`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-right"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={isDark ? '#222428' : '#DDDDD8'}
          />
          <Controls
            className={
              isDark
                ? 'bg-[#111214] border-[#222428] fill-zinc-300 text-zinc-300'
                : 'bg-white border-[#DDDDD8] fill-zinc-700 text-zinc-700'
            }
          />
          <MiniMap
            nodeColor={() => (isDark ? '#3B82F6' : '#2563EB')}
            maskColor={isDark ? 'rgba(11, 11, 12, 0.75)' : 'rgba(247, 247, 245, 0.75)'}
            className={
              isDark
                ? 'bg-[#111214] border-[#222428]'
                : 'bg-white border-[#DDDDD8]'
            }
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div
            id="node-inspector-drawer"
            className={`absolute top-4 right-4 w-80 rounded-xl border p-4 shadow-lg space-y-3 z-50 transition-colors ${
              isDark
                ? 'bg-[#111214] border-[#222428] text-zinc-200'
                : 'bg-white border-[#DDDDD8] text-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  {selectedNode.type.toLowerCase()}
                </span>
                <h4 className="text-sm font-semibold mt-0.5 break-all">
                  {selectedNode.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500 block mb-0.5">Value</span>
                <div
                  className={`p-2 rounded font-mono text-[11px] break-all border ${
                    isDark
                      ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                      : 'bg-zinc-50 border-[#DDDDD8] text-zinc-800'
                  }`}
                >
                  {selectedNode.value}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Confidence</span>
                  <span className="font-medium text-emerald-500">
                    {selectedNode.confidence}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Source</span>
                  <span>{selectedNode.source}</span>
                </div>
              </div>

              {selectedNode.sourceUrl && (
                <div className="pt-1">
                  <a
                    href={selectedNode.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full py-1.5 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-[#2E3136]'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-[#DDDDD8]'
                    }`}
                  >
                    <span>Open source link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
