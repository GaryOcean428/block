// Environment detection and configuration

export const IS_WEBCONTAINER = typeof window !== 'undefined' && 
  window.location && 
  window.location.hostname.includes('webcontainer-api.io');

export const IS_LOCAL_DEV = !IS_WEBCONTAINER && 
  window.location.hostname === 'localhost';

export const getBaseUrl = () => {
  if (IS_WEBCONTAINER) {
    return window.location.origin;
  }
  if (IS_LOCAL_DEV) {
    return 'http://localhost:5173';
  }
  return 'https://your-production-domain.com'; // Update when deploying
};