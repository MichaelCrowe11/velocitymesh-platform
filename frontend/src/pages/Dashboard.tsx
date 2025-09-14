import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  PlayIcon, 
  ChartBarIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  CogIcon,
  CheckCircleIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { SmartOnboarding } from '../components/onboarding/SmartOnboarding';
import { ProgressiveDisclosure } from '../components/ui/ProgressiveDisclosure';
import { CognitiveLoadIndicator, useCognitiveMetrics } from '../components/ui/CognitiveLoadIndicator';
import { AdaptiveButton, useAdaptiveInterface } from '../components/ui/AdaptiveInterface';
import { UserBehaviorTracker } from '../components/analytics/UserBehaviorTracker';

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  successfulRuns: number;
  failedRuns: number;
  computeHoursUsed: number;
  computeHoursLimit: number;
}

interface RecentWorkflow {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  lastRun: string;
  duration?: number;
  nodes?: any[];
  edges?: any[];
  successCount?: number;
  executionCount?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile, config } = useAdaptiveInterface();
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    successfulRuns: 0,
    failedRuns: 0,
    computeHoursUsed: 0,
    computeHoursLimit: 10,
  });
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);

  // Calculate cognitive metrics for selected workflows
  const cognitiveMetrics = useCognitiveMetrics(
    selectedWorkflows.flatMap(id => {
      const workflow = recentWorkflows.find(w => w.id === id);
      return workflow?.nodes || [];
    }),
    selectedWorkflows.flatMap(id => {
      const workflow = recentWorkflows.find(w => w.id === id);
      return workflow?.edges || [];
    })
  );

  useEffect(() => {
    // Check if user needs onboarding
    if (stats.totalWorkflows === 0 && !isLoading) {
      setShowOnboarding(true);
    }

    // Simulate API calls - replace with actual API calls
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - replace with actual API calls
      setStats({
        totalWorkflows: 12,
        activeWorkflows: 8,
        successfulRuns: 156,
        failedRuns: 3,
        computeHoursUsed: 2.5,
        computeHoursLimit: user?.subscriptionPlan === 'starter' ? 10 : 
                          user?.subscriptionPlan === 'professional' ? 100 : 1000,
      });

      setRecentWorkflows([
        {
          id: '1',
          name: 'New User Onboarding',
          status: 'running',
          lastRun: '2 minutes ago',
          duration: 45,
          nodes: [
            { id: 'n1', type: 'trigger' },
            { id: 'n2', type: 'email' },
            { id: 'n3', type: 'condition' }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n2', target: 'n3' }
          ],
          successCount: 45,
          executionCount: 50
        },
        {
          id: '2',
          name: 'Daily Report Generation',
          status: 'completed',
          lastRun: '1 hour ago',
          duration: 120,
          nodes: [
            { id: 'n1', type: 'schedule' },
            { id: 'n2', type: 'database' },
            { id: 'n3', type: 'transform' },
            { id: 'n4', type: 'email' }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n2', target: 'n3' },
            { id: 'e3', source: 'n3', target: 'n4' }
          ],
          successCount: 29,
          executionCount: 30
        },
        {
          id: '3',
          name: 'Customer Support Tickets',
          status: 'completed',
          lastRun: '3 hours ago',
          duration: 30,
          nodes: [
            { id: 'n1', type: 'webhook' },
            { id: 'n2', type: 'condition' },
            { id: 'n3', type: 'slack' },
            { id: 'n4', type: 'database' }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n2', target: 'n3' },
            { id: 'e3', source: 'n2', target: 'n4' }
          ],
          successCount: 78,
          executionCount: 82
        },
        {
          id: '4',
          name: 'Data Backup Process',
          status: 'failed',
          lastRun: '5 hours ago',
          duration: 0,
          nodes: [
            { id: 'n1', type: 'schedule' },
            { id: 'n2', type: 'database' },
            { id: 'n3', type: 's3' }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n2', target: 'n3' }
          ],
          successCount: 2,
          executionCount: 5
        },
      ]);

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [user, stats.totalWorkflows, isLoading]);

  const getStatusColor = (status: RecentWorkflow['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const computeUsagePercentage = (stats.computeHoursUsed / stats.computeHoursLimit) * 100;

  const handleWorkflowSelect = (workflowId: string, selected: boolean) => {
    setSelectedWorkflows(prev => 
      selected 
        ? [...prev, workflowId]
        : prev.filter(id => id !== workflowId)
    );
  };

  const getAdaptiveStatCards = () => {
    const baseStats = [
      {
        title: 'Total Workflows',
        value: stats.totalWorkflows,
        icon: ChartBarIcon,
        color: 'text-primary-600',
        bgColor: 'bg-primary-100 dark:bg-primary-900/20'
      },
      {
        title: 'Active Workflows',
        value: stats.activeWorkflows,
        icon: PlayIcon,
        color: 'text-success-600',
        bgColor: 'bg-success-100 dark:bg-success-900/20'
      },
      {
        title: 'Success Rate',
        value: `${((stats.successfulRuns / Math.max(stats.successfulRuns + stats.failedRuns, 1)) * 100).toFixed(1)}%`,
        icon: CheckCircleIcon,
        color: 'text-success-600',
        bgColor: 'bg-success-100 dark:bg-success-900/20'
      }
    ];

    if (config.showAdvancedOptions) {
      baseStats.push(
        {
          title: 'Successful Runs',
          value: stats.successfulRuns,
          icon: BoltIcon,
          color: 'text-primary-600',
          bgColor: 'bg-primary-100 dark:bg-primary-900/20'
        },
        {
          title: 'Failed Runs',
          value: stats.failedRuns,
          icon: ExclamationTriangleIcon,
          color: 'text-error-600',
          bgColor: 'bg-error-100 dark:bg-error-900/20'
        }
      );
    }

    return baseStats;
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <UserBehaviorTracker />
        <SmartOnboarding
          userName={user?.name}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  const statCards = getAdaptiveStatCards();

  return (
    <div className={`min-h-screen bg-neutral-50 dark:bg-neutral-900 ${config.density === 'compact' ? 'p-4' : config.density === 'spacious' ? 'p-8' : 'p-6'}`}>
      <UserBehaviorTracker />
      
      {/* Personalized Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Welcome back, {user?.name}! 
              {profile.experienceLevel === 'expert' && ' 🚀'}
              {profile.experienceLevel === 'intermediate' && ' ⚡'}
              {profile.experienceLevel === 'beginner' && ' 👋'}
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              {profile.experienceLevel === 'beginner' 
                ? "Let's build something amazing together"
                : profile.experienceLevel === 'intermediate'
                ? "Ready to create powerful workflows?"
                : "Time to architect complex automations"
              }
            </p>
          </div>
          
          {/* AI Assistant Hint */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-success-50 dark:from-primary-900/20 dark:to-success-900/20 rounded-lg border border-primary-200 dark:border-primary-700"
          >
            <SparklesIcon className="w-5 h-5 text-primary-600" />
            <span className="text-sm text-primary-700 dark:text-primary-300">
              AI Assistant Ready
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Adaptive Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-wrap gap-4">
          <Link to="/workflows/new">
            <AdaptiveButton
              variant="primary"
              size="lg"
              tooltip="Create a new workflow with AI assistance"
              className="flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {config.simplifyUI ? 'Create Workflow' : 'New Intelligent Workflow'}
            </AdaptiveButton>
          </Link>
          
          <AdaptiveButton
            tooltip="AI-powered workflow builder"
            variant="primary"
            className="flex items-center bg-success-600 hover:bg-success-700"
          >
            <BoltIcon className="w-5 h-5 mr-2" />
            {config.simplifyUI ? 'AI Builder' : 'AI Quick Build'}
          </AdaptiveButton>
          
          <Link to="/workflows">
            <AdaptiveButton
              tooltip="View all your workflows"
              className="flex items-center"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              {config.simplifyUI ? 'View All' : 'View All Workflows'}
            </AdaptiveButton>
          </Link>

          <AdaptiveButton
            advancedOnly
            tooltip="Batch operations for multiple workflows"
            className="flex items-center"
          >
            <CogIcon className="w-5 h-5 mr-2" />
            Batch Operations
          </AdaptiveButton>
        </div>
      </motion.div>

      {/* Adaptive Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`grid gap-6 mb-8 ${
          config.density === 'compact' 
            ? `grid-cols-2 md:grid-cols-${Math.min(statCards.length, 4)}` 
            : config.density === 'spacious'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : `grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(statCards.length, 4)}`
        }`}
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 ${
              config.density === 'compact' ? 'p-4' : 
              config.density === 'spacious' ? 'p-8' : 'p-6'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {isLoading ? '-' : stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cognitive Load Indicator for Selected Workflows */}
      {selectedWorkflows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8"
        >
          <CognitiveLoadIndicator metrics={cognitiveMetrics} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Workflows with Progressive Disclosure */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center">
                <RocketLaunchIcon className="w-6 h-6 mr-3 text-primary-600" />
                Your Workflows
              </h2>
              <Link to="/workflows">
                <AdaptiveButton size="sm">
                  View All
                </AdaptiveButton>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-600 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentWorkflows.length > 0 ? (
              <div className="space-y-3">
                {recentWorkflows.slice(0, config.simplifyUI ? 3 : 5).map((workflow) => (
                  <ProgressiveDisclosure
                    key={workflow.id}
                    title={workflow.name}
                    summary={`Status: ${workflow.status} • Last run: ${workflow.lastRun}${workflow.duration ? ` • ${workflow.duration}s` : ''}`}
                    variant="card"
                    badge={workflow.status === 'running' ? '●' : workflow.status === 'failed' ? '!' : '○'}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedWorkflows.includes(workflow.id)}
                            onChange={(e) => handleWorkflowSelect(workflow.id, e.target.checked)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            Include in cognitive load analysis
                          </span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">Nodes</div>
                          <div className="text-neutral-600 dark:text-neutral-400">
                            {workflow.nodes?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">Connections</div>
                          <div className="text-neutral-600 dark:text-neutral-400">
                            {workflow.edges?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">Success Rate</div>
                          <div className="text-success-600">
                            {((workflow.successCount || 0) / Math.max(workflow.executionCount || 1, 1) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">Actions</div>
                          <div className="flex items-center space-x-2">
                            <button className="p-1 text-neutral-400 hover:text-primary-600 transition-colors">
                              {workflow.status === 'running' ? (
                                <PauseIcon className="w-4 h-4" />
                              ) : (
                                <PlayIcon className="w-4 h-4" />
                              )}
                            </button>
                            <button className="p-1 text-neutral-400 hover:text-primary-600 transition-colors">
                              <CogIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProgressiveDisclosure>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <SparklesIcon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  Ready to create your first workflow?
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Our AI assistant will guide you through the process
                </p>
                <Link to="/workflows/new">
                  <AdaptiveButton
                    variant="primary"
                    size="lg"
                    className="flex items-center mx-auto"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create Your First Workflow
                  </AdaptiveButton>
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* Adaptive Sidebar */}
        <div className="space-y-6">
          {/* Compute Usage */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 ${
              config.density === 'compact' ? 'p-4' : config.density === 'spacious' ? 'p-8' : 'p-6'
            }`}
          >
            <div className="flex items-center mb-4">
              <ClockIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mr-2" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {config.simplifyUI ? 'Usage' : 'Compute Usage'}
              </h3>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                <span>{stats.computeHoursUsed}h used</span>
                <span>{stats.computeHoursLimit}h limit</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <motion.div
                  className="bg-primary-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(computeUsagePercentage, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {computeUsagePercentage > 80 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg mb-4"
              >
                <p className="text-sm text-warning-800 dark:text-warning-200">
                  {computeUsagePercentage > 95 ? 
                    'Critical: Usage limit almost reached!' :
                    'Approaching usage limit. Consider upgrading.'
                  }
                </p>
              </motion.div>
            )}

            <Link to="/settings/billing">
              <AdaptiveButton 
                size="sm" 
                className="w-full justify-center"
                tooltip="Manage your subscription and billing"
              >
                {config.simplifyUI ? 'Manage Plan' : 'Manage Subscription'}
              </AdaptiveButton>
            </Link>
          </motion.div>

          {/* Intelligent Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`bg-gradient-to-br from-primary-50 to-success-50 dark:from-primary-900/20 dark:to-success-900/20 rounded-lg shadow-sm border border-primary-200 dark:border-primary-700 ${
              config.density === 'compact' ? 'p-4' : config.density === 'spacious' ? 'p-8' : 'p-6'
            }`}
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-primary-600" />
              {profile.experienceLevel === 'beginner' ? 'Getting Started' :
               profile.experienceLevel === 'intermediate' ? 'Pro Tip' : 'Expert Insight'}
            </h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
              {profile.experienceLevel === 'beginner' ? 
                'Start with our guided workflow builder. No coding required!' :
               profile.experienceLevel === 'intermediate' ?
                'Try connecting multiple services for powerful automation chains.' :
                'Use our batch operations to manage complex workflow deployments efficiently.'
              }
            </p>
            <AdaptiveButton
              variant="primary" 
              size="sm"
              className="w-full justify-center"
            >
              {profile.experienceLevel === 'beginner' ? 'Start Tutorial' :
               profile.experienceLevel === 'intermediate' ? 'Explore Templates' : 'Advanced Features'}
            </AdaptiveButton>
          </motion.div>

          {/* Performance Insights - Advanced Only */}
          {config.showAdvancedOptions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 ${
                config.density === 'compact' ? 'p-4' : config.density === 'spacious' ? 'p-8' : 'p-6'
              }`}
            >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Performance Insights
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Avg Response Time</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">1.2s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Memory Usage</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">42MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">API Calls Today</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">1,247</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;