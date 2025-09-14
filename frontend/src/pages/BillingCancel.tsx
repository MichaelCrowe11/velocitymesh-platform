import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const BillingCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <XCircleIcon className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Payment Cancelled
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Your payment was cancelled. No charges were made to your account.
        </p>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 <strong>Did you know?</strong> Our Starter plan is free forever with 10 compute hours per month!
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/billing')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            View Plans Again
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Need help choosing the right plan?
          </p>
          <button
            onClick={() => window.open('mailto:support@velocitymesh.com', '_blank')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingCancel;