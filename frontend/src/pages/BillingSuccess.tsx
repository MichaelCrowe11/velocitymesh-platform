import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const BillingSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Refresh user data to get updated subscription info
    refreshUser();

    // Redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Payment Successful!
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Your subscription has been activated. You now have access to all premium features.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Session ID:
          </p>
          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
            {sessionId || 'N/A'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/workflows/new')}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
          >
            Create Your First Workflow
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-500 mt-6">
          Redirecting to dashboard in 5 seconds...
        </p>
      </div>
    </div>
  );
};

export default BillingSuccess;