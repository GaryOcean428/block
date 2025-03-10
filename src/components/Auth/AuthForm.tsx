import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, resetPassword } from '../../services/auth';

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthFormProps {
  onSuccess?: () => void;
  authMode?: AuthMode;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, authMode: initialAuthMode = 'signin' }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
  };

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const { error: signUpError } = await signUpWithEmail({ email, password });
        if (signUpError) throw new Error(signUpError);

        setMessage('Account created! Please check your email for verification.');
      } else if (authMode === 'signin') {
        const { error: signInError } = await signInWithEmail({ email, password });
        if (signInError) throw new Error(signInError);

        if (onSuccess) onSuccess();
      } else if (authMode === 'reset') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) throw new Error(resetError);

        setMessage('Password reset instructions sent to your email.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-neutral-800 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        {authMode === 'signin' && 'Sign In'}
        {authMode === 'signup' && 'Create Account'}
        {authMode === 'reset' && 'Reset Password'}
      </h2>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 
              dark:text-white transition duration-150"
          />
        </div>

        {authMode !== 'reset' && (
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 
                dark:text-white transition duration-150"
            />
          </div>
        )}

        {authMode === 'signup' && (
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 
                dark:text-white transition duration-150"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition 
            duration-150 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            <>
              {authMode === 'signin' && 'Sign In'}
              {authMode === 'signup' && 'Create Account'}
              {authMode === 'reset' && 'Send Reset Instructions'}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col space-y-2">
        {authMode === 'signin' && (
          <>
            <button
              onClick={() => handleModeChange('signup')}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Need an account? Sign up
            </button>
            <button
              onClick={() => handleModeChange('reset')}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Forgot password?
            </button>
          </>
        )}
        {authMode === 'signup' && (
          <button
            onClick={() => handleModeChange('signin')}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Already have an account? Sign in
          </button>
        )}
        {authMode === 'reset' && (
          <button
            onClick={() => handleModeChange('signin')}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
