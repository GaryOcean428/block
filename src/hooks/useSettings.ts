import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContextDefinitions';

/**
 * Hook to access the settings context
 * Must be used within a SettingsProvider
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
