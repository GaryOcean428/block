/**
 * Button Component
 * A reusable, accessible button component with various variants
 */
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant that changes appearance */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button takes full width of its container */
  fullWidth?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Custom additional class names */
  className?: string;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button component with multiple variants and sizes
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base classes always applied
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors';
    
    // Size classes
    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    // Variant classes - using tailwind utility classes
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
    };
    
    // Classes when button is disabled
    const disabledClasses = 'opacity-50 cursor-not-allowed';
    
    // Full width class
    const fullWidthClass = fullWidth ? 'w-full' : '';
    
    // Loading state
    const loadingContent = isLoading ? (
      <span className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-white" />
    ) : null;
    
    // Combine all classes
    const buttonClasses = [
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      (disabled || isLoading) ? disabledClasses : '',
      fullWidthClass,
      className,
    ].join(' ');
    
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {loadingContent}
        {children}
      </button>
    );
  }
);

// Set display name for debugging
Button.displayName = 'Button';

export default Button;
