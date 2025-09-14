import React, { useState, useEffect, useContext, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AcademicCapIcon,
  RocketLaunchIcon,
  CogIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

/**
 * Adaptive Interface System
 * Dynamically adjusts UI complexity and features based on:
 * - User experience level
 * - Current context and task
 * - Performance preferences
 * - Accessibility needs
 */

interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    density: 'compact' | 'comfortable' | 'spacious';
    animations: boolean;
    advancedFeatures: boolean;
    shortcuts: boolean;
  };
  usage: {
    totalWorkflows: number;
    avgComplexity: number;
    favoriteNodes: string[];
    commonPatterns: string[];
  };
}

interface AdaptiveConfig {
  showAdvancedOptions: boolean;
  simplifyUI: boolean;
  enableShortcuts: boolean;
  showTooltips: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  animationLevel: 'none' | 'reduced' | 'full';
}

interface AdaptiveInterfaceContextType {
  profile: UserProfile;
  config: AdaptiveConfig;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<UserProfile['preferences']>) => void;
}

const AdaptiveInterfaceContext = createContext<AdaptiveInterfaceContextType | null>(null);

export const useAdaptiveInterface = () => {
  const context = useContext(AdaptiveInterfaceContext);
  if (!context) {
    throw new Error('useAdaptiveInterface must be used within AdaptiveInterfaceProvider');
  }
  return context;
};

interface AdaptiveInterfaceProviderProps {
  children: React.ReactNode;
  initialProfile?: Partial<UserProfile>;
}

export const AdaptiveInterfaceProvider: React.FC<AdaptiveInterfaceProviderProps> = ({
  children,
  initialProfile = {}
}) => {
  const [profile, setProfile] = useState<UserProfile>({
    experienceLevel: 'intermediate',
    preferences: {
      theme: 'auto',
      density: 'comfortable',
      animations: true,
      advancedFeatures: false,
      shortcuts: false
    },
    usage: {
      totalWorkflows: 0,
      avgComplexity: 0,
      favoriteNodes: [],
      commonPatterns: []
    },
    ...initialProfile
  });

  const [config, setConfig] = useState<AdaptiveConfig>({
    showAdvancedOptions: false,
    simplifyUI: true,
    enableShortcuts: false,
    showTooltips: true,
    density: 'comfortable',
    animationLevel: 'full'
  });

  // Automatically adapt configuration based on profile
  useEffect(() => {
    const newConfig: AdaptiveConfig = {
      showAdvancedOptions: profile.experienceLevel === 'expert' || profile.preferences.advancedFeatures,
      simplifyUI: profile.experienceLevel === 'beginner',
      enableShortcuts: profile.experienceLevel === 'expert' || profile.preferences.shortcuts,
      showTooltips: profile.experienceLevel !== 'expert',
      density: profile.preferences.density,
      animationLevel: !profile.preferences.animations ? 'none' : 
                     profile.experienceLevel === 'expert' ? 'reduced' : 'full'
    };

    setConfig(newConfig);
  }, [profile]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({
      ...prev,
      ...updates,
      preferences: { ...prev.preferences, ...updates.preferences },
      usage: { ...prev.usage, ...updates.usage }
    }));
  };

  const updatePreferences = (preferences: Partial<UserProfile['preferences']>) => {
    setProfile(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences }
    }));
  };

  return (
    <AdaptiveInterfaceContext.Provider value={{ profile, config, updateProfile, updatePreferences }}>
      {children}
    </AdaptiveInterfaceContext.Provider>
  );
};

// Adaptive UI Components

interface AdaptiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  tooltip?: string;
  advancedOnly?: boolean;
}

export const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  tooltip,
  advancedOnly = false,
  className = '',
  ...props
}) => {
  const { config } = useAdaptiveInterface();
  const [showTooltip, setShowTooltip] = useState(false);

  // Hide advanced features for beginners
  if (advancedOnly && !config.showAdvancedOptions) {
    return null;
  }

  const sizeClasses = {
    sm: config.density === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    md: config.density === 'compact' ? 'px-3 py-1.5 text-sm' : 
        config.density === 'spacious' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
    lg: config.density === 'compact' ? 'px-4 py-2 text-base' : 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600',
    danger: 'bg-error-600 text-white hover:bg-error-700'
  };

  const motionProps = config.animationLevel === 'none' ? {} : {
    whileHover: { scale: config.animationLevel === 'full' ? 1.02 : 1.01 },
    whileTap: { scale: 0.98 },
    transition: { duration: config.animationLevel === 'full' ? 0.2 : 0.1 }
  };

  return (
    <div className="relative">
      <motion.button
        className={`
          rounded-md font-medium transition-colors relative
          ${sizeClasses[size]} ${variantClasses[variant]} ${className}
        `}
        onMouseEnter={() => tooltip && config.showTooltips && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...motionProps}
        {...props}
      >
        {children}
      </motion.button>
      
      {/* Adaptive Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltip && config.showTooltips && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
          >
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AdaptiveFormFieldProps {
  label: string;
  children: React.ReactNode;
  description?: string;
  required?: boolean;
  advancedOnly?: boolean;
}

export const AdaptiveFormField: React.FC<AdaptiveFormFieldProps> = ({
  label,
  children,
  description,
  required = false,
  advancedOnly = false
}) => {
  const { config } = useAdaptiveInterface();

  // Hide advanced fields for beginners
  if (advancedOnly && !config.showAdvancedOptions) {
    return null;
  }

  const spacingClass = {
    compact: 'space-y-1',
    comfortable: 'space-y-2',
    spacious: 'space-y-3'
  }[config.density];

  return (
    <div className={spacingClass}>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
        {advancedOnly && (
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded">
            Advanced
          </span>
        )}
      </label>
      {children}
      {description && config.showTooltips && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
    </div>
  );
};

// Interface Settings Panel
export const InterfaceSettings: React.FC = () => {
  const { profile, updatePreferences } = useAdaptiveInterface();

  const experienceLevels = [
    {
      level: 'beginner' as const,
      icon: AcademicCapIcon,
      title: 'Beginner',
      description: 'New to workflow automation'
    },
    {
      level: 'intermediate' as const,
      icon: CogIcon,
      title: 'Intermediate',
      description: 'Some experience with automation tools'
    },
    {
      level: 'expert' as const,
      icon: RocketLaunchIcon,
      title: 'Expert',
      description: 'Advanced user, show all features'
    }
  ];

  const themes = [
    { key: 'light' as const, icon: SunIcon, label: 'Light' },
    { key: 'dark' as const, icon: MoonIcon, label: 'Dark' },
    { key: 'auto' as const, icon: ComputerDesktopIcon, label: 'Auto' }
  ];

  const densityOptions = [
    { key: 'compact' as const, label: 'Compact', description: 'More content, less spacing' },
    { key: 'comfortable' as const, label: 'Comfortable', description: 'Balanced spacing' },
    { key: 'spacious' as const, label: 'Spacious', description: 'More spacing, easier scanning' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
        Interface Settings
      </h2>

      {/* Experience Level */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Experience Level
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {experienceLevels.map(({ level, icon: Icon, title, description }) => (
            <button
              key={level}
              onClick={() => updatePreferences({ advancedFeatures: level === 'expert' })}
              className={`
                p-4 text-left rounded-lg border-2 transition-all duration-200
                ${profile.experienceLevel === level
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                }
              `}
            >
              <div className="flex items-center space-x-3 mb-2">
                <Icon className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-neutral-900 dark:text-white">
                  {title}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Theme
        </h3>
        <div className="flex space-x-2">
          {themes.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => updatePreferences({ theme: key })}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors
                ${profile.preferences.theme === key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Interface Density
        </h3>
        <div className="space-y-2">
          {densityOptions.map(({ key, label, description }) => (
            <label key={key} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="density"
                value={key}
                checked={profile.preferences.density === key}
                onChange={() => updatePreferences({ density: key })}
                className="mt-1 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white">
                  {label}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Additional Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Additional Preferences
        </h3>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.preferences.animations}
            onChange={(e) => updatePreferences({ animations: e.target.checked })}
            className="text-primary-600 focus:ring-primary-500"
          />
          <div className="text-sm text-neutral-900 dark:text-white">
            Enable animations and transitions
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.preferences.shortcuts}
            onChange={(e) => updatePreferences({ shortcuts: e.target.checked })}
            className="text-primary-600 focus:ring-primary-500"
          />
          <div className="text-sm text-neutral-900 dark:text-white">
            Enable keyboard shortcuts
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.preferences.advancedFeatures}
            onChange={(e) => updatePreferences({ advancedFeatures: e.target.checked })}
            className="text-primary-600 focus:ring-primary-500"
          />
          <div className="text-sm text-neutral-900 dark:text-white">
            Show advanced features
          </div>
        </label>
      </div>
    </div>
  );
};

export default AdaptiveInterfaceProvider;