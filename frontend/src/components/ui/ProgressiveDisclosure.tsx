import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Progressive Disclosure Component
 * Implements cognitive load reduction by revealing complexity gradually
 */

interface ProgressiveDisclosureProps {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  badge?: string | number;
  variant?: 'default' | 'card' | 'minimal';
  className?: string;
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  title,
  summary,
  children,
  defaultOpen = false,
  icon,
  badge,
  variant = 'default',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variants = {
    default: {
      container: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
      header: 'px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
      content: 'px-4 py-3 bg-white dark:bg-gray-900',
    },
    card: {
      container: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
      header: 'px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700',
      content: 'px-5 py-4 border-t border-gray-200 dark:border-gray-700',
    },
    minimal: {
      container: '',
      header: 'py-2 hover:text-primary-600 dark:hover:text-primary-400',
      content: 'py-2 pl-6',
    },
  };

  const style = variants[variant];

  return (
    <div className={`${style.container} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between
          ${style.header}
          transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        `}
        aria-expanded={isOpen}
        aria-controls={`disclosure-content-${title.replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            {isOpen ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
            )}
          </motion.div>
          
          {icon && (
            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
              {icon}
            </div>
          )}
          
          <div className="flex-1 text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            {summary && !isOpen && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {summary}
              </p>
            )}
          </div>
        </div>
        
        {badge && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`disclosure-content-${title.replace(/\s+/g, '-')}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={style.content}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Compound component for grouped disclosures
interface DisclosureGroupProps {
  children: ReactNode;
  allowMultiple?: boolean;
  className?: string;
}

export const DisclosureGroup: React.FC<DisclosureGroupProps> = ({
  children,
  allowMultiple = true,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
};

export default ProgressiveDisclosure;