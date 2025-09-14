import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BrainIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

/**
 * Cognitive Load Indicator
 * Visual feedback system to help users understand workflow complexity
 * Based on cognitive load theory and mental model research
 */

interface CognitiveMetrics {
  complexity: number; // 0-100
  decisionPoints: number;
  parallelPaths: number;
  integrationCount: number;
  estimatedProcessingTime: number;
}

interface CognitiveLoadIndicatorProps {
  metrics: CognitiveMetrics;
  onOptimizationSuggestion?: (suggestions: string[]) => void;
}

export const CognitiveLoadIndicator: React.FC<CognitiveLoadIndicatorProps> = ({
  metrics,
  onOptimizationSuggestion
}) => {
  const [loadLevel, setLoadLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Calculate cognitive load based on multiple factors
  useEffect(() => {
    const {
      complexity,
      decisionPoints,
      parallelPaths,
      integrationCount,
      estimatedProcessingTime
    } = metrics;

    // Weighted scoring algorithm based on cognitive science research
    const complexityScore = complexity * 0.4;
    const decisionScore = Math.min(decisionPoints * 8, 40); // Cap at 40 points
    const parallelScore = Math.min(parallelPaths * 5, 25); // Parallel processing adds cognitive load
    const integrationScore = Math.min(integrationCount * 3, 15);
    const timeScore = Math.min(estimatedProcessingTime / 60, 10); // Minutes to score

    const totalScore = complexityScore + decisionScore + parallelScore + integrationScore + timeScore;

    // Determine load level and generate suggestions
    const newSuggestions: string[] = [];

    if (totalScore < 30) {
      setLoadLevel('low');
    } else if (totalScore < 60) {
      setLoadLevel('medium');
      if (decisionPoints > 5) {
        newSuggestions.push('Consider consolidating decision points to reduce complexity');
      }
    } else if (totalScore < 85) {
      setLoadLevel('high');
      newSuggestions.push('Workflow is becoming complex - consider breaking into smaller workflows');
      if (parallelPaths > 3) {
        newSuggestions.push('Multiple parallel paths increase cognitive load - consider sequential processing');
      }
      if (integrationCount > 8) {
        newSuggestions.push('Many integrations detected - group related operations together');
      }
    } else {
      setLoadLevel('critical');
      newSuggestions.push('Workflow complexity is critical - immediate simplification recommended');
      newSuggestions.push('Consider using sub-workflows to break down complexity');
      newSuggestions.push('Review each decision point for necessity');
    }

    setSuggestions(newSuggestions);
    
    if (onOptimizationSuggestion && newSuggestions.length > 0) {
      onOptimizationSuggestion(newSuggestions);
    }
  }, [metrics, onOptimizationSuggestion]);

  const getLoadConfig = () => {
    switch (loadLevel) {
      case 'low':
        return {
          color: 'success',
          bgColor: 'bg-success-100 dark:bg-success-900/20',
          borderColor: 'border-success-300 dark:border-success-700',
          textColor: 'text-success-800 dark:text-success-200',
          icon: CheckCircleIcon,
          title: 'Optimal Complexity',
          description: 'This workflow is easy to understand and maintain'
        };
      case 'medium':
        return {
          color: 'warning',
          bgColor: 'bg-warning-100 dark:bg-warning-900/20',
          borderColor: 'border-warning-300 dark:border-warning-700',
          textColor: 'text-warning-800 dark:text-warning-200',
          icon: InformationCircleIcon,
          title: 'Moderate Complexity',
          description: 'Workflow is manageable but could benefit from optimization'
        };
      case 'high':
        return {
          color: 'error',
          bgColor: 'bg-error-100 dark:bg-error-900/20',
          borderColor: 'border-error-300 dark:border-error-700',
          textColor: 'text-error-800 dark:text-error-200',
          icon: ExclamationTriangleIcon,
          title: 'High Complexity',
          description: 'Consider simplifying to improve maintainability'
        };
      case 'critical':
        return {
          color: 'error',
          bgColor: 'bg-error-200 dark:bg-error-900/40',
          borderColor: 'border-error-400 dark:border-error-600',
          textColor: 'text-error-900 dark:text-error-100',
          icon: ExclamationTriangleIcon,
          title: 'Critical Complexity',
          description: 'Immediate simplification required'
        };
    }
  };

  const config = getLoadConfig();
  const IconComponent = config.icon;

  // Calculate progress bar width based on total cognitive load
  const progressWidth = Math.min((metrics.complexity + 
    (metrics.decisionPoints * 8) + 
    (metrics.parallelPaths * 5) + 
    (metrics.integrationCount * 3)) / 100 * 100, 100);

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <IconComponent className={`w-5 h-5 ${config.textColor}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-xs opacity-80 ${config.textColor}`}>
              {config.description}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${config.textColor}`}>
            {Math.round(progressWidth)}
          </div>
          <div className={`text-xs opacity-60 ${config.textColor}`}>
            Load Score
          </div>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs ${config.textColor} opacity-70`}>
            Cognitive Load
          </span>
          <span className={`text-xs ${config.textColor} opacity-70`}>
            {progressWidth.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${
              loadLevel === 'low' ? 'from-success-400 to-success-600' :
              loadLevel === 'medium' ? 'from-warning-400 to-warning-600' :
              'from-error-400 to-error-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressWidth}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`text-center p-2 bg-white/50 dark:bg-black/20 rounded`}>
          <div className={`text-lg font-semibold ${config.textColor}`}>
            {metrics.decisionPoints}
          </div>
          <div className={`text-xs ${config.textColor} opacity-60`}>
            Decision Points
          </div>
        </div>
        <div className={`text-center p-2 bg-white/50 dark:bg-black/20 rounded`}>
          <div className={`text-lg font-semibold ${config.textColor}`}>
            {metrics.parallelPaths}
          </div>
          <div className={`text-xs ${config.textColor} opacity-60`}>
            Parallel Paths
          </div>
        </div>
        <div className={`text-center p-2 bg-white/50 dark:bg-black/20 rounded`}>
          <div className={`text-lg font-semibold ${config.textColor}`}>
            {metrics.integrationCount}
          </div>
          <div className={`text-xs ${config.textColor} opacity-60`}>
            Integrations
          </div>
        </div>
        <div className={`text-center p-2 bg-white/50 dark:bg-black/20 rounded`}>
          <div className={`text-lg font-semibold ${config.textColor}`}>
            {Math.round(metrics.estimatedProcessingTime)}s
          </div>
          <div className={`text-xs ${config.textColor} opacity-60`}>
            Est. Time
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-current border-opacity-20 pt-3">
          <h4 className={`font-medium text-sm ${config.textColor} mb-2 flex items-center`}>
            <BrainIcon className="w-4 h-4 mr-2" />
            Optimization Suggestions
          </h4>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`text-xs ${config.textColor} opacity-80 flex items-start`}
              >
                <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0" />
                {suggestion}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Hook for calculating cognitive metrics from workflow data
export const useCognitiveMetrics = (nodes: any[], edges: any[]) => {
  return React.useMemo(() => {
    const metrics: CognitiveMetrics = {
      complexity: 0,
      decisionPoints: 0,
      parallelPaths: 0,
      integrationCount: 0,
      estimatedProcessingTime: 0
    };

    // Count decision points (nodes with multiple outputs)
    nodes.forEach(node => {
      const outgoingEdges = edges.filter(edge => edge.source === node.id);
      if (outgoingEdges.length > 1) {
        metrics.decisionPoints += 1;
      }
      
      // Count integrations (external service nodes)
      if (['http', 'api', 'webhook', 'email', 'slack'].includes(node.type)) {
        metrics.integrationCount += 1;
      }
    });

    // Calculate parallel paths by finding nodes with multiple incoming edges
    const parallelNodes = nodes.filter(node => {
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      return incomingEdges.length > 1;
    });
    metrics.parallelPaths = parallelNodes.length;

    // Estimate complexity based on node count and connections
    metrics.complexity = Math.min((nodes.length * 5) + (edges.length * 3), 100);

    // Estimate processing time (simplified calculation)
    metrics.estimatedProcessingTime = nodes.length * 2 + metrics.integrationCount * 5;

    return metrics;
  }, [nodes, edges]);
};

export default CognitiveLoadIndicator;