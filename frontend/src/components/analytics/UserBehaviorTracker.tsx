import React, { useEffect, useCallback, useRef } from 'react';
import { useAdaptiveInterface } from '../ui/AdaptiveInterface';

/**
 * User Behavior Tracker
 * Tracks user interactions to improve the adaptive interface
 * and provide personalized suggestions
 */

interface InteractionEvent {
  type: 'click' | 'hover' | 'scroll' | 'keyboard' | 'workflow_action';
  element?: string;
  context?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface BehaviorPattern {
  pattern: string;
  frequency: number;
  lastSeen: number;
  confidence: number;
}

interface UserBehaviorTrackerProps {
  onPatternDetected?: (pattern: BehaviorPattern) => void;
  trackingEnabled?: boolean;
}

export const UserBehaviorTracker: React.FC<UserBehaviorTrackerProps> = ({
  onPatternDetected,
  trackingEnabled = true
}) => {
  const { profile, updateProfile } = useAdaptiveInterface();
  const interactionHistory = useRef<InteractionEvent[]>([]);
  const patterns = useRef<Map<string, BehaviorPattern>>(new Map());
  const sessionStart = useRef(Date.now());

  // Track interaction events
  const trackInteraction = useCallback((event: Omit<InteractionEvent, 'timestamp'>) => {
    if (!trackingEnabled) return;

    const fullEvent: InteractionEvent = {
      ...event,
      timestamp: Date.now()
    };

    interactionHistory.current.push(fullEvent);
    
    // Keep only last 1000 interactions to prevent memory issues
    if (interactionHistory.current.length > 1000) {
      interactionHistory.current = interactionHistory.current.slice(-1000);
    }

    // Analyze patterns every 10 interactions
    if (interactionHistory.current.length % 10 === 0) {
      analyzePatterns();
    }
  }, [trackingEnabled]);

  // Analyze behavior patterns
  const analyzePatterns = useCallback(() => {
    const recentInteractions = interactionHistory.current.slice(-50); // Last 50 interactions
    
    // Pattern 1: Frequent use of advanced features
    const advancedActions = recentInteractions.filter(
      e => e.metadata?.advanced || e.element?.includes('advanced')
    ).length;
    
    if (advancedActions > 10) {
      updatePattern('uses_advanced_features', advancedActions / recentInteractions.length);
    }

    // Pattern 2: Keyboard shortcut usage
    const keyboardActions = recentInteractions.filter(e => e.type === 'keyboard').length;
    if (keyboardActions > 5) {
      updatePattern('prefers_keyboard', keyboardActions / recentInteractions.length);
    }

    // Pattern 3: Workflow complexity preference
    const workflowActions = recentInteractions.filter(e => e.type === 'workflow_action');
    const complexActions = workflowActions.filter(
      e => e.metadata?.complexity === 'high'
    ).length;
    
    if (complexActions > 3) {
      updatePattern('prefers_complex_workflows', complexActions / workflowActions.length);
    }

    // Pattern 4: Quick vs detailed interactions
    const quickActions = recentInteractions.filter(
      e => e.metadata?.duration && e.metadata.duration < 2000
    ).length;
    
    if (quickActions > recentInteractions.length * 0.7) {
      updatePattern('prefers_quick_actions', quickActions / recentInteractions.length);
    }

    // Pattern 5: Error frequency
    const errorActions = recentInteractions.filter(
      e => e.metadata?.error || e.element?.includes('error')
    ).length;
    
    if (errorActions > 5) {
      updatePattern('encounters_frequent_errors', errorActions / recentInteractions.length);
    }
  }, []);

  const updatePattern = (patternName: string, confidence: number) => {
    const existing = patterns.current.get(patternName);
    const newPattern: BehaviorPattern = {
      pattern: patternName,
      frequency: existing ? existing.frequency + 1 : 1,
      lastSeen: Date.now(),
      confidence: Math.min(confidence, 1.0)
    };

    patterns.current.set(patternName, newPattern);
    
    if (onPatternDetected) {
      onPatternDetected(newPattern);
    }

    // Auto-adjust user profile based on patterns
    adaptUserProfile(newPattern);
  };

  const adaptUserProfile = (pattern: BehaviorPattern) => {
    if (pattern.confidence < 0.6) return; // Only act on high-confidence patterns

    const updates: any = {};

    switch (pattern.pattern) {
      case 'uses_advanced_features':
        if (profile.experienceLevel === 'beginner' || profile.experienceLevel === 'intermediate') {
          updates.experienceLevel = 'intermediate';
          updates.preferences = { ...profile.preferences, advancedFeatures: true };
        }
        break;

      case 'prefers_keyboard':
        updates.preferences = { ...profile.preferences, shortcuts: true };
        break;

      case 'prefers_complex_workflows':
        if (profile.experienceLevel === 'beginner') {
          updates.experienceLevel = 'intermediate';
        } else if (profile.experienceLevel === 'intermediate' && pattern.confidence > 0.8) {
          updates.experienceLevel = 'expert';
        }
        break;

      case 'prefers_quick_actions':
        updates.preferences = { 
          ...profile.preferences, 
          density: 'compact',
          animations: false
        };
        break;

      case 'encounters_frequent_errors':
        // Suggest more guidance for users having trouble
        updates.preferences = { 
          ...profile.preferences, 
          advancedFeatures: false
        };
        if (profile.experienceLevel === 'expert') {
          updates.experienceLevel = 'intermediate';
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      updateProfile(updates);
    }
  };

  // Set up global event listeners
  useEffect(() => {
    if (!trackingEnabled) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      trackInteraction({
        type: 'click',
        element: target.tagName.toLowerCase(),
        context: target.closest('[data-context]')?.getAttribute('data-context') || 'unknown',
        metadata: {
          className: target.className,
          advanced: target.hasAttribute('data-advanced'),
          x: event.clientX,
          y: event.clientY
        }
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Track keyboard shortcuts
      const isShortcut = event.ctrlKey || event.metaKey || event.altKey;
      if (isShortcut) {
        trackInteraction({
          type: 'keyboard',
          element: 'shortcut',
          metadata: {
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
          }
        });
      }
    };

    const handleScroll = () => {
      trackInteraction({
        type: 'scroll',
        metadata: {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        }
      });
    };

    // Throttled scroll handler
    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null as any;
      }, 1000);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', throttledScroll);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [trackingEnabled, trackInteraction]);

  // Track session duration and update user stats
  useEffect(() => {
    const updateSessionStats = () => {
      const sessionDuration = Date.now() - sessionStart.current;
      const interactionCount = interactionHistory.current.length;
      
      updateProfile({
        usage: {
          ...profile.usage,
          totalWorkflows: profile.usage.totalWorkflows + 1,
          // Calculate engagement score based on interactions per minute
          avgComplexity: Math.min(interactionCount / (sessionDuration / 60000), 10)
        }
      });
    };

    // Update stats every 5 minutes
    const interval = setInterval(updateSessionStats, 5 * 60 * 1000);
    
    // Update on page unload
    const handleBeforeUnload = () => {
      updateSessionStats();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile.usage, updateProfile]);

  // Public method to track workflow-specific actions
  const trackWorkflowAction = useCallback((action: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'workflow_action',
      element: action,
      context: 'workflow_builder',
      metadata
    });
  }, [trackInteraction]);

  // Expose tracking function through ref for parent components
  React.useImperativeHandle(ref => ({
    trackWorkflowAction,
    getPatterns: () => Array.from(patterns.current.values()),
    getRecentInteractions: (count: number = 50) => interactionHistory.current.slice(-count)
  }), [trackWorkflowAction]);

  // Component doesn't render anything - it's purely for tracking
  return null;
};

// Hook for components to easily track workflow actions
export const useWorkflowTracking = () => {
  const trackerRef = useRef<{
    trackWorkflowAction: (action: string, metadata?: Record<string, any>) => void;
  } | null>(null);

  const trackWorkflowAction = useCallback((action: string, metadata?: Record<string, any>) => {
    if (trackerRef.current) {
      trackerRef.current.trackWorkflowAction(action, metadata);
    }
  }, []);

  return { trackWorkflowAction, trackerRef };
};

export default UserBehaviorTracker;