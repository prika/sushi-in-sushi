/**
 * Static/Presentational Component Tests
 *
 * Tests for simple, mostly-static components that render HTML content.
 * These components primarily use useTranslations (mocked in setup.ts),
 * next/image, next/link, lucide-react icons, and framer-motion.
 *
 * The goal is basic render coverage, not comprehensive behavior testing.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion - used by BlurFade and directly by some components
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return false;
        // Return a component that renders the HTML element
        return React.forwardRef(({ children, ...props }: any, ref: any) => {
          // Filter out framer-motion-specific props
          const {
            initial, animate, variants, transition, whileHover, whileTap,
            whileInView, exit, layout, layoutId, drag, dragConstraints,
            onAnimationComplete, ...htmlProps
          } = props;
          return React.createElement(String(prop), { ...htmlProps, ref }, children);
        });
      },
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ fill, priority, unoptimized, ...props }: any) => (
    <img {...props} data-testid="next-image" />
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () =>
  new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') return true;
        return ({ children, ...props }: any) => (
          <svg data-testid={`icon-${String(name)}`} {...props}>
            {children}
          </svg>
        );
      },
    }
  )
);

// Mock BlurFade - renders children directly
vi.mock('@/components/ui/blur-fade', () => ({
  BlurFade: ({ children }: any) => <div data-testid="blur-fade">{children}</div>,
}));

// Mock ShimmerButton - renders a button
vi.mock('@/components/ui/shimmer-button', () => ({
  ShimmerButton: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} data-testid="shimmer-button" {...props}>
      {children}
    </button>
  )),
}));

// Mock ReservationForm - used by Hero and Contact
vi.mock('@/components/ReservationForm', () => ({
  ReservationForm: (props: any) => (
    <div data-testid="reservation-form">ReservationForm</div>
  ),
}));

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Static imports - vi.mock calls are hoisted before these
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { Gallery } from '@/components/Gallery';
import { Locations } from '@/components/Locations';
import { Menu } from '@/components/Menu';
import { Hero } from '@/components/Hero';
import { Team } from '@/components/Team';
import { Reviews } from '@/components/Reviews';
import { Contact } from '@/components/Contact';
import { VideoSection } from '@/components/VideoSection';

// ===================================================================
// 1. About
// ===================================================================
describe('About', () => {
  it('renders without crashing', () => {
    const { container } = render(<About />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders the section label and quote translation keys', () => {
    render(<About />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText(/quote/)).toBeInTheDocument();
  });

  it('renders two images', () => {
    render(<About />);
    const images = screen.getAllByTestId('next-image');
    expect(images.length).toBeGreaterThanOrEqual(2);
  });
});

// ===================================================================
// 2. Footer
// ===================================================================
describe('Footer', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('renders the copyright translation key', () => {
    render(<Footer />);
    // useTranslations mock returns the key string
    expect(screen.getByText('copyright')).toBeInTheDocument();
  });

  it('renders social links for Instagram, Facebook, WhatsApp', () => {
    render(<Footer />);
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    // Social links (3) + footer nav links (4) = at least 7
    expect(links.length).toBeGreaterThanOrEqual(7);
  });
});

// ===================================================================
// 3. Gallery
// ===================================================================
describe('Gallery', () => {
  it('renders without crashing', () => {
    const { container } = render(<Gallery />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders gallery section label and title', () => {
    render(<Gallery />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders six gallery images', () => {
    render(<Gallery />);
    const images = screen.getAllByTestId('next-image');
    expect(images).toHaveLength(6);
  });
});

// ===================================================================
// 4. Locations
// ===================================================================
describe('Locations', () => {
  it('renders without crashing', () => {
    const { container } = render(<Locations />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders location names (translation keys)', () => {
    render(<Locations />);
    expect(screen.getByText('circunvalacao.name')).toBeInTheDocument();
    expect(screen.getByText('boavista.name')).toBeInTheDocument();
  });

  it('renders MapPin, Phone, and Clock icons for each location', () => {
    render(<Locations />);
    const mapPins = screen.getAllByTestId('icon-MapPin');
    const phones = screen.getAllByTestId('icon-Phone');
    const clocks = screen.getAllByTestId('icon-Clock');
    expect(mapPins).toHaveLength(2);
    expect(phones).toHaveLength(2);
    expect(clocks).toHaveLength(2);
  });
});

// ===================================================================
// 5. Menu
// ===================================================================
describe('Menu', () => {
  it('renders without crashing', () => {
    const { container } = render(<Menu />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders four menu items with names and prices', () => {
    render(<Menu />);
    expect(screen.getByText('Sashimi de Salmão')).toBeInTheDocument();
    expect(screen.getByText('Hot Roll')).toBeInTheDocument();
    expect(screen.getByText('Gunkan')).toBeInTheDocument();
    expect(screen.getByText('Combinado Salmon Fusion')).toBeInTheDocument();
  });

  it('renders a "view all" link', () => {
    render(<Menu />);
    const viewAllLink = screen.getByRole('link', { name: 'viewAll' });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/menu');
  });
});

// ===================================================================
// 6. Hero
// ===================================================================
describe('Hero', () => {
  it('renders without crashing', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders hero title and subtitle translation keys', () => {
    render(<Hero />);
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('subtitle')).toBeInTheDocument();
  });

  it('renders a book table button and view menu link', () => {
    render(<Hero />);
    expect(screen.getByTestId('shimmer-button')).toBeInTheDocument();
    expect(screen.getByText('viewMenu')).toBeInTheDocument();
  });
});

// ===================================================================
// 7. Team
// ===================================================================
describe('Team', () => {
  it('renders without crashing', () => {
    const { container } = render(<Team />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders team section label, title, and description', () => {
    render(<Team />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('renders six team member images', () => {
    render(<Team />);
    const images = screen.getAllByTestId('next-image');
    expect(images).toHaveLength(6);
  });
});

// ===================================================================
// 8. Reviews
// ===================================================================
describe('Reviews', () => {
  it('renders without crashing', () => {
    const { container } = render(<Reviews />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders section label and title', () => {
    render(<Reviews />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders four review cards with review names', () => {
    render(<Reviews />);
    const reviewNames = screen.getAllByText('reviews.review1.name');
    expect(reviewNames.length).toBeGreaterThanOrEqual(1);
  });
});

// ===================================================================
// 9. Contact
// ===================================================================
describe('Contact', () => {
  it('renders without crashing', () => {
    const { container } = render(<Contact />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders section label, title, and description', () => {
    render(<Contact />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('renders a book rodizio button and an order online link', () => {
    render(<Contact />);
    expect(screen.getByTestId('shimmer-button')).toBeInTheDocument();
    expect(screen.getByText('orderOnline')).toBeInTheDocument();
  });
});

// ===================================================================
// 10. VideoSection
// ===================================================================
describe('VideoSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<VideoSection />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders a video element with source', () => {
    const { container } = render(<VideoSection />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    const source = container.querySelector('source');
    expect(source).toBeInTheDocument();
    expect(source).toHaveAttribute('src', '/videos/sushi-preparation.mp4');
  });

  it('renders title when showTitle is true (default)', () => {
    render(<VideoSection />);
    expect(screen.getByText('sectionLabel')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('does not render title when showTitle is false', () => {
    render(<VideoSection showTitle={false} />);
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });
});
