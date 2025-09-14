import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { WorkflowProvider } from './contexts/WorkflowContext';
import { CollaborationProvider } from './contexts/CollaborationContext';
import { AIProvider } from './contexts/AIContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdaptiveInterfaceProvider } from './components/ui/AdaptiveInterface';

import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkflowEditor = lazy(() => import('./pages/WorkflowEditor'));
const WorkflowsList = lazy(() => import('./pages/WorkflowsList'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Billing = lazy(() => import('./pages/Billing'));
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
const BillingCancel = lazy(() => import('./pages/BillingCancel'));

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AdaptiveInterfaceProvider>
              <AIProvider>
                <WorkflowProvider>
                  <CollaborationProvider>
                  <Router>
                    <div className=\"min-h-screen bg-gray-50 dark:bg-gray-900\">
                      <Toaster
                        position=\"top-right\"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: '#363636',
                            color: '#fff',
                          },
                          success: {
                            duration: 3000,
                            iconTheme: {
                              primary: '#10b981',
                              secondary: '#fff',
                            },
                          },
                          error: {
                            duration: 5000,
                            iconTheme: {
                              primary: '#ef4444',
                              secondary: '#fff',
                            },
                          },
                        }}
                      />
                      
                      <Routes>
                        {/* Public routes */}
                        <Route path=\"/login\" element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <Login />
                          </Suspense>
                        } />
                        <Route path=\"/signup\" element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <Signup />
                          </Suspense>
                        } />
                        
                        {/* Protected routes */}
                        <Route path=\"/\" element={<Layout />}>
                          <Route index element={<Navigate to=\"/dashboard\" replace />} />
                          <Route path=\"dashboard\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Dashboard />
                            </Suspense>
                          } />
                          <Route path=\"workflows\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <WorkflowsList />
                            </Suspense>
                          } />
                          <Route path=\"workflows/:id\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <WorkflowEditor />
                            </Suspense>
                          } />
                          <Route path=\"integrations\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Integrations />
                            </Suspense>
                          } />
                          <Route path=\"settings\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Settings />
                            </Suspense>
                          } />
                          <Route path=\"billing\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Billing />
                            </Suspense>
                          } />
                          <Route path=\"billing/success\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <BillingSuccess />
                            </Suspense>
                          } />
                          <Route path=\"billing/cancel\" element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <BillingCancel />
                            </Suspense>
                          } />
                        </Route>
                        
                        {/* Fallback route */}
                        <Route path=\"*\" element={<Navigate to=\"/dashboard\" replace />} />
                      </Routes>
                    </div>
                  </Router>
                  </CollaborationProvider>
                </WorkflowProvider>
              </AIProvider>
            </AdaptiveInterfaceProvider>
          </AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;