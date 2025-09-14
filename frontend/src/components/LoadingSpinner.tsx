import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className = '',
  message,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`loading-spinner ${sizeClasses[size]} border-2`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;