import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  SparklesIcon,
  LightBulbIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ProgressiveDisclosure } from '../ui/ProgressiveDisclosure';

/**
 * Intelligent Workflow Builder
 * Implements cognitive load reduction through smart defaults, contextual suggestions,
 * and progressive complexity revelation
 */

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
    suggestedNext?: string[];
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  nodeType: string;
  reasoning: string;
}

interface IntelligentWorkflowBuilderProps {
  onWorkflowChange: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
}

export const IntelligentWorkflowBuilder: React.FC<IntelligentWorkflowBuilderProps> = ({
  onWorkflowChange,
  initialNodes = [],
  initialEdges = []
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Cognitive load reduction: Smart defaults for common workflows
  const workflowTemplates = [
    {
      id: 'data-processing',
      name: 'Data Processing Pipeline',
      description: 'Process and transform data from various sources',
      nodes: [
        { type: 'trigger', label: 'Data Source', suggestedNext: ['transform', 'filter'] },
        { type: 'transform', label: 'Transform Data', suggestedNext: ['validate', 'store'] },
        { type: 'store', label: 'Save Results', suggestedNext: ['notify', 'webhook'] }
      ]
    },
    {
      id: 'notification-flow',
      name: 'Smart Notifications',
      description: 'Intelligent notification routing based on conditions',
      nodes: [
        { type: 'trigger', label: 'Event Trigger', suggestedNext: ['condition', 'filter'] },
        { type: 'condition', label: 'Check Conditions', suggestedNext: ['notify-slack', 'notify-email'] },
        { type: 'notify', label: 'Send Notification', suggestedNext: ['log', 'metrics'] }
      ]
    }
  ];

  // AI-powered suggestions based on current workflow context
  const generateSuggestions = useCallback((currentNode: WorkflowNode | null) => {
    if (!currentNode) {
      // Initial suggestions when no node is selected
      const initialSuggestions: SmartSuggestion[] = [
        {
          id: 'start-trigger',
          title: 'Add Trigger',
          description: 'Start your workflow with a trigger event',
          confidence: 0.95,
          nodeType: 'trigger',
          reasoning: 'Every workflow needs a starting point'
        },
        {
          id: 'use-template',
          title: 'Use Template',
          description: 'Start with a proven workflow pattern',
          confidence: 0.85,
          nodeType: 'template',
          reasoning: 'Templates reduce setup time and ensure best practices'
        }
      ];
      setSuggestions(initialSuggestions);
      return;
    }

    // Context-aware suggestions based on current node
    const contextualSuggestions: SmartSuggestion[] = [];

    if (currentNode.type === 'trigger') {
      contextualSuggestions.push({
        id: 'add-filter',
        title: 'Add Filter',
        description: 'Filter incoming data based on conditions',
        confidence: 0.9,
        nodeType: 'filter',
        reasoning: 'Filtering early reduces processing overhead'
      });
    }

    if (currentNode.type === 'http' || currentNode.type === 'api') {
      contextualSuggestions.push({
        id: 'add-retry',
        title: 'Add Retry Logic',
        description: 'Handle API failures gracefully',
        confidence: 0.85,
        nodeType: 'retry',
        reasoning: 'External APIs can fail, retry logic improves reliability'
      });
    }

    setSuggestions(contextualSuggestions);
  }, []);

  // Handle node addition with smart positioning
  const addNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    const newPosition = position || {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position: newPosition,
      data: {
        label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
        suggestedNext: getNextNodeSuggestions(nodeType)
      }
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    onWorkflowChange(updatedNodes, edges);

    // Auto-connect to selected node if applicable
    if (selectedNode) {
      const newEdge: WorkflowEdge = {
        id: `edge-${selectedNode.id}-${newNode.id}`,
        source: selectedNode.id,
        target: newNode.id
      };
      const updatedEdges = [...edges, newEdge];
      setEdges(updatedEdges);
      onWorkflowChange(updatedNodes, updatedEdges);
    }

    setSelectedNode(newNode);
    generateSuggestions(newNode);
  }, [nodes, edges, selectedNode, onWorkflowChange, generateSuggestions]);

  // Get contextual next node suggestions
  const getNextNodeSuggestions = (nodeType: string): string[] => {
    const suggestionMap: Record<string, string[]> = {
      trigger: ['filter', 'transform', 'condition'],
      filter: ['transform', 'condition', 'store'],
      transform: ['validate', 'store', 'notify'],
      condition: ['notify-email', 'notify-slack', 'webhook'],
      api: ['retry', 'transform', 'store'],
      store: ['notify', 'webhook', 'metrics']
    };
    return suggestionMap[nodeType] || [];
  };

  // Initialize with smart suggestions
  useEffect(() => {
    if (nodes.length === 0) {
      generateSuggestions(null);
      setShowSuggestions(true);
    }
  }, [nodes.length, generateSuggestions]);

  return (
    <div className="h-full flex">
      {/* Main Canvas */}
      <div className="flex-1 relative bg-neutral-50 dark:bg-neutral-900">
        <div
          ref={canvasRef}
          className="w-full h-full overflow-hidden"
          onClick={() => setSelectedNode(null)}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
          </div>

          {/* Workflow Nodes */}
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                drag
                dragMomentum={false}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  zIndex: selectedNode?.id === node.id ? 10 : 1
                }}
                className={`
                  w-48 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md border-2 cursor-pointer
                  ${selectedNode?.id === node.id 
                    ? 'border-primary-500 shadow-lg' 
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                  }
                  transition-all duration-200
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node);
                  generateSuggestions(node);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-neutral-900 dark:text-white">
                      {node.data.label}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {node.type}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State with Suggestions */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <LightBulbIcon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                    Start Building Your Workflow
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Choose from templates or start from scratch. Our AI will suggest the next best steps.
                  </p>
                </motion.div>

                {/* Quick Start Templates */}
                <div className="grid gap-3">
                  {workflowTemplates.map((template) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => addNode('trigger')}
                      className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 transition-colors text-left"
                    >
                      <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {template.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intelligent Sidebar */}
      <div className="w-80 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-primary-600" />
            Smart Assistant
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            AI-powered suggestions for your workflow
          </p>
        </div>

        {/* Suggestions */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <AnimatePresence>
            {suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-primary-50 to-success-50 dark:from-primary-900/20 dark:to-success-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    {suggestion.title}
                  </h3>
                  <div className="flex items-center text-xs">
                    <div 
                      className={`w-2 h-2 rounded-full mr-1 ${
                        suggestion.confidence > 0.9 ? 'bg-success-500' :
                        suggestion.confidence > 0.7 ? 'bg-warning-500' : 'bg-neutral-400'
                      }`} 
                    />
                    <span className="text-neutral-500">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  {suggestion.description}
                </p>

                <ProgressiveDisclosure
                  title="Why this suggestion?"
                  variant="minimal"
                  className="mb-3"
                >
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {suggestion.reasoning}
                  </p>
                </ProgressiveDisclosure>

                <button
                  onClick={() => addNode(suggestion.nodeType)}
                  className="w-full px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add to Workflow
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Node Properties Panel */}
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-t border-neutral-200 dark:border-neutral-700 pt-4"
            >
              <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                Node Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(n => 
                        n.id === selectedNode.id 
                          ? { ...n, data: { ...n.data, label: e.target.value } }
                          : n
                      );
                      setNodes(updatedNodes);
                      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: e.target.value } });
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Type
                  </label>
                  <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-md text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedNode.type}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligentWorkflowBuilder;