/**
 * Additional UI Component Tests
 *
 * Tests for EmptyState, Toast, Skeleton, and AlertModal components.
 * These are reusable UI primitives used throughout the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ===================================================================
// EmptyState
// ===================================================================
import {
  EmptyState,
  EmptyCart,
  EmptyOrders,
  EmptySearch,
  EmptyProducts,
} from '@/presentation/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(
      <EmptyState title="No items" description="Try adding some items" />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Try adding some items')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    // Only the title should be present, no description
    expect(screen.queryByText('Try adding')).not.toBeInTheDocument();
  });

  it('renders an action button when action prop is provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No results"
        action={{ label: 'Add new', onClick }}
      />
    );
    const button = screen.getByText('Add new');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when action is not provided', () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a custom icon when provided', () => {
    render(
      <EmptyState
        title="Custom"
        icon={<span data-testid="custom-icon">Icon</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  describe('compact variant', () => {
    it('renders with compact styling', () => {
      const { container } = render(
        <EmptyState title="Compact" variant="compact" />
      );
      // Compact variant uses py-8 instead of py-12
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('py-8');
    });

    it('renders description in compact variant', () => {
      render(
        <EmptyState
          title="Compact"
          description="Some details"
          variant="compact"
        />
      );
      expect(screen.getByText('Some details')).toBeInTheDocument();
    });
  });
});

describe('EmptyCart', () => {
  it('renders cart empty state with default text', () => {
    render(<EmptyCart />);
    expect(screen.getByText('Carrinho vazio')).toBeInTheDocument();
    expect(
      screen.getByText('Adicione produtos do menu para começar o seu pedido')
    ).toBeInTheDocument();
  });

  it('renders a browse button when onBrowse is provided', () => {
    const onBrowse = vi.fn();
    render(<EmptyCart onBrowse={onBrowse} />);
    const button = screen.getByText('Ver Menu');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it('does not render a browse button when onBrowse is not provided', () => {
    render(<EmptyCart />);
    expect(screen.queryByText('Ver Menu')).not.toBeInTheDocument();
  });
});

describe('EmptyOrders', () => {
  it('renders orders empty state', () => {
    render(<EmptyOrders />);
    expect(screen.getByText('Sem pedidos')).toBeInTheDocument();
    expect(
      screen.getByText('Os seus pedidos aparecerão aqui')
    ).toBeInTheDocument();
  });
});

describe('EmptySearch', () => {
  it('renders search empty state with query', () => {
    render(<EmptySearch query="sashimi" />);
    expect(screen.getByText('Sem resultados')).toBeInTheDocument();
    expect(
      screen.getByText('Não encontrámos resultados para "sashimi"')
    ).toBeInTheDocument();
  });
});

describe('EmptyProducts', () => {
  it('renders products empty state', () => {
    render(<EmptyProducts />);
    expect(screen.getByText('Sem produtos')).toBeInTheDocument();
    expect(
      screen.getByText('Não há produtos disponíveis nesta categoria')
    ).toBeInTheDocument();
  });
});

// ===================================================================
// Toast
// ===================================================================
import { ToastProvider, useToast } from '@/presentation/components/ui/Toast';

// Helper component to trigger toasts in tests
function ToastTrigger({
  type,
  message,
}: {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(type, message)} data-testid="trigger">
      Show Toast
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useToast throws when used outside ToastProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastTrigger type="info" message="test" />)).toThrow(
      'useToast must be used within ToastProvider'
    );
    spy.mockRestore();
  });

  it('renders children without any toasts initially', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows a success toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Operation succeeded!" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Operation succeeded!')).toBeInTheDocument();
  });

  it('shows an error toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="error" message="Something went wrong" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows a warning toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="warning" message="Please be careful" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Please be careful')).toBeInTheDocument();
  });

  it('auto-dismisses toast after 3 seconds', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="info" message="Temporary message" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Temporary message')).toBeInTheDocument();

    // Advance timers past the 3 second auto-dismiss
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByText('Temporary message')).not.toBeInTheDocument();
  });

  it('dismisses toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Dismissible toast" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Dismissible toast')).toBeInTheDocument();

    // The dismiss button is inside the toast item
    const dismissButtons = document.querySelectorAll(
      '.rounded-xl button'
    );
    // The last button in the toast is the dismiss button
    const dismissButton = dismissButtons[dismissButtons.length - 1];
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument();
  });
});

// ===================================================================
// Skeleton
// ===================================================================
import {
  Skeleton,
  ProductCardSkeleton,
  ProductListSkeleton,
  OrderCardSkeleton,
  OrderListSkeleton,
  TableSkeleton,
  CategoryTabsSkeleton,
  SessionCardSkeleton,
} from '@/presentation/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders with default props', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('bg-gray-200');
    expect(el.className).toContain('rounded-lg'); // rectangular variant default
    expect(el.className).toContain('animate-pulse'); // pulse animation default
  });

  it('renders with text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded');
  });

  it('renders with circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded-full');
  });

  it('renders with custom width and height as numbers', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100px');
    expect(el.style.height).toBe('50px');
  });

  it('renders with custom width and height as strings', () => {
    const { container } = render(<Skeleton width="80%" height="2rem" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('80%');
    expect(el.style.height).toBe('2rem');
  });

  it('renders with shimmer animation', () => {
    const { container } = render(<Skeleton animation="shimmer" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('overflow-hidden');
  });

  it('renders with no animation', () => {
    const { container } = render(<Skeleton animation="none" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="my-custom-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('my-custom-class');
  });
});

describe('ProductCardSkeleton', () => {
  it('renders card structure with skeleton elements', () => {
    const { container } = render(<ProductCardSkeleton />);
    const skeletons = container.querySelectorAll('.bg-gray-200');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('ProductListSkeleton', () => {
  it('renders default 6 product card skeletons', () => {
    const { container } = render(<ProductListSkeleton />);
    const cards = container.querySelectorAll('.bg-white');
    expect(cards).toHaveLength(6);
  });

  it('renders custom count of product card skeletons', () => {
    const { container } = render(<ProductListSkeleton count={3} />);
    const cards = container.querySelectorAll('.bg-white');
    expect(cards).toHaveLength(3);
  });
});

describe('OrderCardSkeleton', () => {
  it('renders order card skeleton structure', () => {
    const { container } = render(<OrderCardSkeleton />);
    const skeletons = container.querySelectorAll('.bg-gray-200');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('OrderListSkeleton', () => {
  it('renders default 3 order card skeletons', () => {
    const { container } = render(<OrderListSkeleton />);
    const cards = container.querySelectorAll('.border-gray-200');
    expect(cards).toHaveLength(3);
  });

  it('renders custom count of order card skeletons', () => {
    const { container } = render(<OrderListSkeleton count={5} />);
    const cards = container.querySelectorAll('.border-gray-200');
    expect(cards).toHaveLength(5);
  });
});

describe('TableSkeleton', () => {
  it('renders a table with default 5 rows and 5 columns', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
    // Each row should have 5 cells
    const firstRowCells = rows[0].querySelectorAll('td');
    expect(firstRowCells).toHaveLength(5);
  });

  it('renders with custom rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    const firstRowCells = rows[0].querySelectorAll('td');
    expect(firstRowCells).toHaveLength(4);
  });
});

describe('CategoryTabsSkeleton', () => {
  it('renders default 5 tab skeletons', () => {
    const { container } = render(<CategoryTabsSkeleton />);
    const skeletons = container.querySelectorAll('.bg-gray-200');
    expect(skeletons).toHaveLength(5);
  });

  it('renders custom count of tab skeletons', () => {
    const { container } = render(<CategoryTabsSkeleton count={3} />);
    const skeletons = container.querySelectorAll('.bg-gray-200');
    expect(skeletons).toHaveLength(3);
  });
});

describe('SessionCardSkeleton', () => {
  it('renders session card skeleton structure', () => {
    const { container } = render(<SessionCardSkeleton />);
    const skeletons = container.querySelectorAll('.bg-gray-200');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

// ===================================================================
// AlertModal
// ===================================================================
import { AlertModal } from '@/presentation/components/ui/AlertModal';

describe('AlertModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Alert Title',
    message: 'This is an alert message.',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('renders when isOpen is true', () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('This is an alert message.')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<AlertModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Alert Title')).not.toBeInTheDocument();
  });

  it('renders with role alertdialog and correct aria attributes', () => {
    render(<AlertModal {...defaultProps} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'alert-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'alert-description');
  });

  it('renders default button text as "OK"', () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(<AlertModal {...defaultProps} buttonText="Got it" />);
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });

  it('calls onClose when the button is clicked', () => {
    render(<AlertModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    render(<AlertModal {...defaultProps} />);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<AlertModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open', () => {
    render(<AlertModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll on unmount', () => {
    const { unmount } = render(<AlertModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  describe('variants', () => {
    it('renders success variant with green button styling', () => {
      render(<AlertModal {...defaultProps} variant="success" />);
      const button = screen.getByRole('button', { name: 'OK' });
      expect(button.className).toContain('bg-green-600');
    });

    it('renders error variant with red button styling', () => {
      render(<AlertModal {...defaultProps} variant="error" />);
      const button = screen.getByRole('button', { name: 'OK' });
      expect(button.className).toContain('bg-red-600');
    });

    it('renders warning variant with yellow button styling', () => {
      render(<AlertModal {...defaultProps} variant="warning" />);
      const button = screen.getByRole('button', { name: 'OK' });
      expect(button.className).toContain('bg-yellow-600');
    });

    it('renders info variant by default with blue button styling', () => {
      render(<AlertModal {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'OK' });
      expect(button.className).toContain('bg-blue-600');
    });
  });
});
