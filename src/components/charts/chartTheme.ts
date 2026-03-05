// Chart theme constants — consistent colors and defaults for all Recharts components

export const CHART_COLORS = {
  // Brand
  gold: '#D4AF37',
  goldLight: '#E5C158',
  goldDark: '#B8962E',

  // Status (matching existing StatusBadge)
  pending: '#EAB308',
  confirmed: '#22C55E',
  preparing: '#3B82F6',
  ready: '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
  noShow: '#6B7280',
  completed: '#3B82F6',

  // Customer tiers
  tier1: '#6B7280', // Novo (gray)
  tier2: '#3B82F6', // Identificado (blue)
  tier3: '#F59E0B', // Cliente (amber)
  tier4: '#10B981', // Regular (emerald)
  tier5: '#8B5CF6', // VIP (purple)

  // General palette for categories/series
  palette: [
    '#D4AF37', '#3B82F6', '#22C55E', '#EF4444',
    '#8B5CF6', '#F97316', '#EC4899', '#14B8A6',
    '#F59E0B', '#6366F1',
  ],

  // UI
  grid: '#E5E7EB',
  axis: '#9CA3AF',
  tooltip: '#1F2937',
} as const;

export const CHART_DEFAULTS = {
  margin: { top: 5, right: 20, bottom: 5, left: 0 },
  fontSize: 12,
  gridStrokeDasharray: '3 3',
  animationDuration: 800,
  height: 300,
} as const;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-PT').format(value);
}
