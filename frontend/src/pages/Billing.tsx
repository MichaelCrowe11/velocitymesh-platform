import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CreditCardIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  computeHours: number;
  features: string[];
  popular?: boolean;
}

interface UsageData {
  computeHoursUsed: number;
  computeHoursLimit: number;
  billingCycleStart: string;
  subscriptionPlan: string;
}

const Billing: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlansAndUsage();
  }, []);

  const fetchPlansAndUsage = async () => {
    try {
      setLoading(true);
      const [plansRes, usageRes] = await Promise.all([
        axios.get('/api/billing/plans'),
        axios.get('/api/billing/usage').catch(() => null),
      ]);

      const plansData = plansRes.data.map((plan: PricingPlan) => ({
        ...plan,
        popular: plan.id === 'professional',
      }));
      
      setPlans(plansData);
      if (usageRes) {
        setUsage(usageRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setProcessingPlan(planId);
      const response = await axios.post('/api/billing/create-checkout', {
        planId,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setProcessingPlan('portal');
      const response = await axios.post('/api/billing/create-portal', {
        returnUrl: window.location.href,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getUsagePercentage = () => {
    if (!usage || usage.computeHoursLimit === -1) return 0;
    return (usage.computeHoursUsed / usage.computeHoursLimit) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Simple, transparent pricing that scales with your business
        </p>
      </div>

      {/* Current Usage */}
      {usage && user?.subscriptionPlan !== 'starter' && (
        <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Usage
            </h2>
            <button
              onClick={handleManageSubscription}
              disabled={processingPlan === 'portal'}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {processingPlan === 'portal' ? (
                <>
                  <ArrowPathIcon className="inline w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Subscription'
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Compute Hours Used</span>
                <span>
                  {usage.computeHoursUsed.toFixed(2)} / {usage.computeHoursLimit === -1 ? 'Unlimited' : usage.computeHoursLimit} hours
                </span>
              </div>
              {usage.computeHoursLimit !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      getUsagePercentage() > 80 ? 'bg-yellow-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span>Current Plan: </span>
              <span className="font-semibold capitalize">{usage.subscriptionPlan}</span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span>Billing Cycle: </span>
              <span>{new Date(usage.billingCycleStart).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = user?.subscriptionPlan === plan.id;
          const isDowngrade = 
            user?.subscriptionPlan === 'professional' && plan.id === 'starter' ||
            user?.subscriptionPlan === 'enterprise' && ['starter', 'professional'].includes(plan.id) ||
            user?.subscriptionPlan === 'unlimited' && ['starter', 'professional', 'enterprise'].includes(plan.id);

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                <div className="flex items-baseline mb-6">
                  <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
                </div>

                <div className="mb-6">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <SparklesIcon className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="font-semibold">
                      {plan.computeHours === -1 ? 'Unlimited' : plan.computeHours} compute hours
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan || processingPlan !== null || plan.id === 'starter'}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : plan.id === 'starter'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isDowngrade
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } ${processingPlan === plan.id ? 'opacity-75' : ''}`}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <ArrowPathIcon className="inline w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : plan.id === 'starter' ? (
                    'Free Plan'
                  ) : isDowngrade ? (
                    'Downgrade'
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
          Frequently Asked Questions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              What are compute hours?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Compute hours measure the processing time used by your workflows. 
              Simple workflows use less, complex AI-powered workflows use more.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Can I change plans anytime?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes! You can upgrade or downgrade at any time. Changes take effect 
              immediately and we'll prorate the billing.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              What happens if I exceed my limit?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              We'll notify you when you're approaching your limit. You can upgrade 
              your plan or purchase additional compute hours.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Is there a free trial?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              The Starter plan is free forever with 10 compute hours per month. 
              Perfect for trying out VelocityMesh!
            </p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-16 text-center">
        <div className="flex justify-center items-center space-x-8 mb-4">
          <div className="flex items-center">
            <CreditCardIcon className="w-6 h-6 text-green-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Secure Payment via Stripe</span>
          </div>
          <div className="flex items-center">
            <CheckIcon className="w-6 h-6 text-green-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Cancel Anytime</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          All prices are in USD. Taxes may apply.
        </p>
      </div>
    </div>
  );
};

export default Billing;