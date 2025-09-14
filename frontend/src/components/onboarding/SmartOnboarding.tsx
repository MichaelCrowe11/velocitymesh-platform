import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  SparklesIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import confetti from 'canvas-confetti';

/**
 * Smart Onboarding Component
 * Implements psychological principles for reduced cognitive load and increased engagement
 */

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  completed: boolean;
  optional?: boolean;
  estimatedTime?: string;
}

interface SmartOnboardingProps {
  userName?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export const SmartOnboarding: React.FC<SmartOnboardingProps> = ({
  userName = 'there',
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to VelocityMesh',
      description: 'Let\'s get you set up in just 3 minutes',
      icon: <RocketLaunchIcon className="w-6 h-6" />,
      action: () => console.log('Welcome viewed'),
      completed: false,
      estimatedTime: '30 seconds',
    },
    {
      id: 'first-workflow',
      title: 'Create Your First Workflow',
      description: 'Try our AI assistant or choose from templates',
      icon: <SparklesIcon className="w-6 h-6" />,
      action: () => console.log('Create workflow'),
      completed: false,
      estimatedTime: '1 minute',
    },
    {
      id: 'connect-integration',
      title: 'Connect Your First Integration',
      description: 'Link Slack, Email, or any of 500+ services',
      icon: <LightBulbIcon className="w-6 h-6" />,
      action: () => console.log('Connect integration'),
      completed: false,
      estimatedTime: '1 minute',
    },
    {
      id: 'explore-dashboard',
      title: 'Explore Your Dashboard',
      description: 'See analytics and monitor your workflows',
      icon: <ChartBarIcon className="w-6 h-6" />,
      action: () => console.log('Explore dashboard'),
      completed: false,
      optional: true,
      estimatedTime: '30 seconds',
    },
  ];

  const progress = (completedSteps.size / steps.filter(s => !s.optional).length) * 100;

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    
    // Micro-celebration for each step
    if (!completedSteps.has(stepId)) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      });
    }

    // Check if all required steps are complete
    const requiredSteps = steps.filter(s => !s.optional);
    const allRequiredComplete = requiredSteps.every(s => 
      completedSteps.has(s.id) || s.id === stepId
    );

    if (allRequiredComplete && !showCelebration) {
      setShowCelebration(true);
      // Big celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => onComplete(), 2000);
    } else {
      // Auto-advance to next step
      const nextIndex = steps.findIndex(s => !completedSteps.has(s.id) && s.id !== stepId);
      if (nextIndex !== -1) {
        setTimeout(() => setCurrentStep(nextIndex), 500);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Personalized Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome{userName !== 'there' ? `, ${userName}` : ''}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Let's get your automation journey started in just a few simple steps
        </p>
      </motion.div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Your Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = index === currentStep;
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-4 rounded-lg border-2 transition-all duration-300
                  ${isCompleted 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : isCurrent
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`
                    flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {step.title}
                      </h3>
                      {step.optional && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                    {step.estimatedTime && !isCompleted && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        ⏱ {step.estimatedTime}
                      </p>
                    )}
                    
                    {/* Action Button */}
                    {isCurrent && !isCompleted && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => {
                          step.action();
                          handleStepComplete(step.id);
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <span>Let's Do This</span>
                        <ArrowRightIcon className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Step Number */}
                <div className="absolute -left-2 -top-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {index + 1}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Skip Option (with psychological nudge to complete) */}
      {onSkip && progress < 100 && (
        <div className="mt-8 text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            I'll explore on my own
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            You're {100 - Math.round(progress)}% away from unlocking all features
          </p>
        </div>
      )}

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're All Set!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You've completed the setup. Time to build something amazing!
              </p>
              <button
                onClick={onComplete}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                Start Building
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartOnboarding;