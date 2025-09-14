import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  OnSelectionChange,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'react-flow-renderer';

import { useWorkflow } from '../../contexts/WorkflowContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { useAI } from '../../contexts/AIContext';

// Custom node types
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import LoopNode from './nodes/LoopNode';
import AIAssistantNode from './nodes/AIAssistantNode';

// Custom edge types
import SmartEdge from './edges/SmartEdge';
import ConditionalEdge from './edges/ConditionalEdge';

import NodePalette from './NodePalette';
import WorkflowToolbar from './WorkflowToolbar';
import CollaboratorsCursor from './CollaboratorsCursor';
import AIDebugger from './AIDebugger';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  aiAssistant: AIAssistantNode,
};

const edgeTypes = {
  smart: SmartEdge,
  conditional: ConditionalEdge,
};

interface WorkflowCanvasProps {
  workflowId: string;
  readonly?: boolean;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ workflowId, readonly = false }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  const { currentWorkflow, updateWorkflow, executeWorkflow, isExecuting } = useWorkflow();
  const { collaborators, broadcastChange, onRemoteChange } = useCollaboration();
  const { suggestOptimizations, debugWorkflow, aiInsights } = useAI();

  const [nodes, setNodes, onNodesChange] = useNodesState(currentWorkflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentWorkflow?.edges || []);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAIDebugger, setShowAIDebugger] = useState(false);

  // Real-time collaboration handler
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (readonly) return;
    
    onNodesChange(changes);
    
    // Broadcast changes to collaborators
    broadcastChange({
      type: 'nodes',
      changes,
      userId: collaborators.currentUser?.id,
      timestamp: Date.now(),
    });
  }, [onNodesChange, broadcastChange, collaborators.currentUser, readonly]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readonly) return;
    
    onEdgesChange(changes);
    
    // Broadcast changes to collaborators
    broadcastChange({
      type: 'edges',
      changes,
      userId: collaborators.currentUser?.id,
      timestamp: Date.now(),
    });
  }, [onEdgesChange, broadcastChange, collaborators.currentUser, readonly]);

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    if (readonly) return;
    
    const newEdge = {
      ...connection,
      id: `edge-${Date.now()}`,
      type: 'smart',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Broadcast to collaborators
    broadcastChange({
      type: 'connect',
      connection: newEdge,
      userId: collaborators.currentUser?.id,
      timestamp: Date.now(),
    });
  }, [setEdges, broadcastChange, collaborators.currentUser, readonly]);

  // Handle drag and drop from node palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readonly) return;
      
      event.preventDefault();
      setIsDragOver(false);

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          config: {},
          status: 'idle',
        },
        style: {
          width: 200,
          height: 80,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Broadcast to collaborators
      broadcastChange({
        type: 'add',
        node: newNode,
        userId: collaborators.currentUser?.id,
        timestamp: Date.now(),
      });
    },
    [reactFlowInstance, setNodes, broadcastChange, collaborators.currentUser, readonly]
  );

  // Handle selection changes
  const onSelectionChange: OnSelectionChange = useCallback((params) => {
    setSelectedNodes(params.nodes);
  }, []);

  // AI-powered suggestions
  const handleAIOptimize = useCallback(async () => {
    if (!currentWorkflow) return;
    
    const optimizations = await suggestOptimizations(currentWorkflow);
    
    // Apply optimizations with user confirmation
    if (optimizations.length > 0) {
      // Show optimization suggestions to user
      console.log('AI Optimizations:', optimizations);
    }
  }, [currentWorkflow, suggestOptimizations]);

  // Auto-save workflow
  useEffect(() => {
    if (currentWorkflow && (nodes.length > 0 || edges.length > 0)) {
      const saveTimeout = setTimeout(() => {
        updateWorkflow(workflowId, { nodes, edges });
      }, 1000); // Debounced auto-save

      return () => clearTimeout(saveTimeout);
    }
  }, [nodes, edges, workflowId, updateWorkflow, currentWorkflow]);

  // Handle remote collaboration changes
  useEffect(() => {
    const unsubscribe = onRemoteChange((change) => {
      switch (change.type) {
        case 'nodes':
          setNodes((nds) => {
            // Apply remote node changes
            const updatedNodes = [...nds];
            // Implementation depends on change format
            return updatedNodes;
          });
          break;
        case 'edges':
          setEdges((eds) => {
            // Apply remote edge changes
            const updatedEdges = [...eds];
            // Implementation depends on change format
            return updatedEdges;
          });
          break;
        case 'add':
          if (change.node) {
            setNodes((nds) => [...nds, change.node]);
          }
          break;
      }
    });

    return unsubscribe;
  }, [onRemoteChange, setNodes, setEdges]);

  // Memoized component props
  const flowProps = useMemo(() => ({
    nodes,
    edges,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onSelectionChange,
    nodeTypes,
    edgeTypes,
    snapToGrid: true,
    snapGrid: [15, 15] as [number, number],
    attributionPosition: 'bottom-left' as const,
    proOptions: { hideAttribution: true },
    fitView: true,
    className: `workflow-canvas ${isDragOver ? 'drag-over' : ''}`,
  }), [
    nodes,
    edges,
    handleNodesChange,
    handleEdgesChange,
    onConnect,
    onSelectionChange,
    isDragOver,
  ]);

  return (
    <div className=\"flex h-full\">
      {/* Node Palette */}
      {!readonly && (
        <div className=\"w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700\">
          <NodePalette />
        </div>
      )}

      {/* Main Canvas */}
      <div className=\"flex-1 relative\">
        {/* Toolbar */}
        <WorkflowToolbar
          onExecute={() => executeWorkflow(workflowId)}
          onOptimize={handleAIOptimize}
          onDebug={() => setShowAIDebugger(true)}
          isExecuting={isExecuting}
          selectedNodesCount={selectedNodes.length}
          readonly={readonly}
        />

        {/* ReactFlow Canvas */}
        <div
          ref={reactFlowWrapper}
          className=\"h-full\"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <ReactFlow
            {...flowProps}
            onInit={setReactFlowInstance}
          >
            <Controls 
              showInteractive={!readonly}
              className=\"react-flow__controls--custom\"
            />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#10b981';
                  case 'action': return '#3b82f6';
                  case 'condition': return '#f59e0b';
                  case 'loop': return '#8b5cf6';
                  case 'aiAssistant': return '#ec4899';
                  default: return '#6b7280';
                }
              }}
              className=\"react-flow__minimap--custom\"
            />
            <Background 
              variant=\"dots\" 
              gap={20} 
              size={1}
              className=\"react-flow__background--custom\"
            />
          </ReactFlow>

          {/* Collaborators' cursors */}
          {collaborators.activeUsers.map((user) => (
            <CollaboratorsCursor
              key={user.id}
              user={user}
              position={user.cursor}
            />
          ))}

          {/* Drag overlay */}
          {isDragOver && (
            <div className=\"absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 pointer-events-none flex items-center justify-center\">
              <div className=\"bg-blue-500 text-white px-4 py-2 rounded-lg font-medium\">
                Drop node here
              </div>
            </div>
          )}
        </div>

        {/* AI Debugger Panel */}
        {showAIDebugger && (
          <AIDebugger
            workflow={currentWorkflow}
            onClose={() => setShowAIDebugger(false)}
            insights={aiInsights}
          />
        )}
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
const WorkflowCanvasWrapper: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvasWrapper;