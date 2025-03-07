/**
 * Button Component Tests
 * Using Vitest and React Testing Library as required by Windsurf rules
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders properly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600'); // Default primary style
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    let button = screen.getByRole('button', { name: /secondary/i });
    
    expect(button).toHaveClass('bg-gray-200');
    
    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button', { name: /danger/i });
    
    expect(button).toHaveClass('bg-red-600');
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    
    expect(button).toHaveClass('px-2.5', 'py-1.5', 'text-xs');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('becomes full width when specified', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button', { name: /full width/i });
    
    expect(button).toHaveClass('w-full');
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toContainElement(screen.getByText('Loading'));
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled/i });
    
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('passes additional props correctly', () => {
    render(
      <Button data-testid="test-button" aria-label="Test Button">
        Test
      </Button>
    );
    const button = screen.getByTestId('test-button');
    
    expect(button).toHaveAttribute('aria-label', 'Test Button');
  });
});
