import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // window.Sentry?.captureException(error, { extra: errorInfo });
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <div className="mt-4 text-center">
              <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                We encountered an unexpected error. Please refresh the page and try again.
              </p>
            </div>

            <div className="mt-6 flex flex-col space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary w-full"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="btn btn-secondary w-full"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6">
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto">
                    <div className="text-red-600 dark:text-red-400">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mt-2 text-gray-600 dark:text-gray-400">
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div className="mt-2 text-gray-600 dark:text-gray-400">
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;