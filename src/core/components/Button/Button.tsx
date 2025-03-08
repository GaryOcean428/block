/**
 * Button Component
 * A reusable, accessible button component with various variants
 */
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant that changes appearance */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button takes full width of its container */
  fullWidth?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Icon to display before text */
  startIcon?: React.ReactNode;
  /** Icon to display after text */
  endIcon?: React.ReactNode;
  /** Custom additional class names */
  className?: string;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button component with multiple variants and sizes
 *
 * @example
 * // Primary button
 * <Button>Click me</Button>
 *
 * @example
 * // Danger button with loading state
 * <Button variant="danger" isLoading>Delete</Button>
 *
 * @example
 * // Button with icon
 * <Button startIcon={<IconName />}>With icon</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      startIcon,
      endIcon,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base classes always applied
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none';

    // Size classes
    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    };

    // Variant classes - using tailwind utility classes
    const variantClasses = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
      secondary:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      outline:
        'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      ghost:
        'text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
      success:
        'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50',
    };

    // Classes when button is disabled
    const disabledClasses = 'opacity-50 cursor-not-allowed';

    // Full width class
    const fullWidthClass = fullWidth ? 'w-full' : '';

    // Loading state
    const loadingSpinner = (
      <span
        className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
    );

    // Combine all classes
    const buttonClasses = [
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      disabled || isLoading ? disabledClasses : '',
      fullWidthClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && <span className="mr-2">{loadingSpinner}</span>}
        {!isLoading && startIcon && <span className="mr-2">{startIcon}</span>}
        {children}
        {!isLoading && endIcon && <span className="ml-2">{endIcon}</span>}
      </button>
    );
  }
);

// Set display name for debugging
Button.displayName = 'Button';

export default Button;
