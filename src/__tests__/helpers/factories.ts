/**
 * Test Factories
 * Helper functions to create test data with sensible defaults
 */

import type { Reservation, ReservationSettings } from '@/types/database';

// ============================================
// RESERVATION FACTORY
// ============================================
export function createTestReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'reservation-1',
    first_name: 'João',
    last_name: 'Silva',
    email: 'joao@test.com',
    phone: '912345678',
    reservation_date: getFutureDate(1),
    reservation_time: '19:00:00',
    party_size: 4,
    location: 'circunvalacao',
    is_rodizio: true,
    special_requests: null,
    occasion: null,
    status: 'pending',
    marketing_consent: false,
    table_id: null,
    confirmed_by: null,
    confirmed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    session_id: null,
    seated_at: null,
    // Email tracking fields
    customer_email_id: null,
    customer_email_sent_at: null,
    customer_email_delivered_at: null,
    customer_email_opened_at: null,
    customer_email_status: null,
    confirmation_email_id: null,
    confirmation_email_sent_at: null,
    confirmation_email_delivered_at: null,
    confirmation_email_opened_at: null,
    confirmation_email_status: null,
    day_before_reminder_id: null,
    day_before_reminder_sent_at: null,
    day_before_reminder_delivered_at: null,
    day_before_reminder_opened_at: null,
    day_before_reminder_status: null,
    same_day_reminder_id: null,
    same_day_reminder_sent_at: null,
    same_day_reminder_delivered_at: null,
    same_day_reminder_opened_at: null,
    same_day_reminder_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// RESERVATION SETTINGS FACTORY
// ============================================
export function createTestReservationSettings(overrides: Partial<ReservationSettings> = {}): ReservationSettings {
  return {
    id: 1,
    day_before_reminder_enabled: true,
    day_before_reminder_hours: 24,
    same_day_reminder_enabled: true,
    same_day_reminder_hours: 2,
    rodizio_waste_policy_enabled: true,
    rodizio_waste_fee_per_piece: 2.5,
    updated_at: new Date().toISOString(),
    updated_by: null,
    ...overrides,
  };
}

// ============================================
// PRODUCT FACTORY
// ============================================
export function createTestProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    name: 'Sashimi Salmão',
    description: 'Fatias de salmão fresco',
    price: 12.5,
    category_id: 'category-1',
    image_url: null,
    is_available: true,
    is_rodizio: true,
    sort_order: 1,
    service_modes: [],
    service_prices: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// ORDER FACTORY
// ============================================
export function createTestOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    session_id: 'session-1',
    product_id: 'product-1',
    quantity: 2,
    unit_price: 10.5,
    notes: null,
    status: 'pending',
    session_customer_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// SESSION FACTORY
// ============================================
export function createTestSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    table_id: 'table-1',
    started_at: new Date().toISOString(),
    closed_at: null,
    is_rodizio: true,
    num_people: 4,
    status: 'active',
    notes: null,
    total_amount: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// TABLE FACTORY
// ============================================
export function createTestTable(overrides: Record<string, unknown> = {}) {
  return {
    id: 'table-1',
    number: 1,
    name: 'Mesa 1',
    location: 'circunvalacao',
    status: 'available',
    is_active: true,
    current_session_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// CLOSURE FACTORY
// ============================================
export function createTestClosure(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    closure_date: getFutureDate(7),
    location: null, // null = both locations
    reason: 'Feriado Nacional',
    is_recurring: false,
    recurring_day_of_week: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// STAFF FACTORY
// ============================================
export function createTestStaff(overrides: Record<string, unknown> = {}) {
  return {
    id: 'staff-1',
    email: 'staff@test.com',
    name: 'João Silva',
    role: 'admin',
    location: 'circunvalacao',
    auth_user_id: 'auth-user-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a date string N days from today
 */
export function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

/**
 * Get a date string N days in the past
 */
export function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date as string
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a time string N hours from now
 */
export function getFutureTime(hoursAhead: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursAhead);
  return date.toTimeString().slice(0, 5) + ':00';
}
