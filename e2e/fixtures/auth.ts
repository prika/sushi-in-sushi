/**
 * Playwright Authentication Fixture
 * Provides authenticated contexts for different user roles
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';

// Test user credentials - should match your test database/environment
// These match the passwords in the database migration (001_user_management.sql)
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@sushinsushi.pt',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  },
  kitchen: {
    email: process.env.TEST_KITCHEN_EMAIL || 'cozinha@sushinsushi.pt',
    password: process.env.TEST_KITCHEN_PASSWORD || 'cozinha123',
    role: 'kitchen',
  },
  waiter: {
    email: process.env.TEST_WAITER_EMAIL || 'empregado@sushinsushi.pt',
    password: process.env.TEST_WAITER_PASSWORD || 'empregado123',
    role: 'waiter',
  },
};

type UserRole = keyof typeof TEST_USERS;

// Extended test fixture type
type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  kitchenPage: Page;
  waiterPage: Page;
  loginAs: (role: UserRole) => Promise<void>;
};

/**
 * Helper function to perform login via UI
 */
async function performLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login');

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation or error
  try {
    // Wait for either redirect or error message
    await Promise.race([
      page.waitForURL(/\/(admin|cozinha|waiter)/, { timeout: 10000 }),
      page.waitForSelector('.text-red-400, [class*="red"]', { timeout: 10000 }),
    ]);

    // Check if we're on an authenticated page
    const url = page.url();
    return url.includes('/admin') || url.includes('/cozinha') || url.includes('/waiter');
  } catch {
    return false;
  }
}

/**
 * Helper function to perform login via legacy API (faster, uses FALLBACK_USERS)
 * This bypasses Supabase Auth and uses the staff table + fallback credentials
 */
async function performApiLogin(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  try {
    // Use the legacy login endpoint that supports FALLBACK_USERS
    const response = await page.request.post('/api/auth/login', {
      data: { email, password },
    });

    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({}));
      console.log('API login failed:', response.status(), errorData);
      return false;
    }

    // Refresh the page to pick up cookies
    await page.goto('/');
    return true;
  } catch (error) {
    console.error('API login error:', error);
    return false;
  }
}

// Map roles to their redirect paths
const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: '/admin',
  kitchen: '/cozinha',
  waiter: '/waiter',
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Generic login function
  loginAs: async ({ page }, use) => {
    const loginFn = async (role: UserRole) => {
      const user = TEST_USERS[role];
      if (!user) {
        throw new Error(`Unknown role: ${role}`);
      }

      // Try API login first (faster)
      const apiSuccess = await performApiLogin(page, user.email, user.password);
      if (apiSuccess) {
        // Navigate to the appropriate page after API login
        const redirectPath = ROLE_REDIRECTS[role];
        await page.goto(redirectPath);
        return;
      }

      // Fall back to UI login (handles redirect automatically)
      const uiSuccess = await performLogin(page, user.email, user.password);
      if (!uiSuccess) {
        throw new Error(`Failed to login as ${role}`);
      }
    };

    await use(loginFn);
  },

  // Pre-authenticated admin page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = TEST_USERS.admin;
    // Try API login first (uses FALLBACK_USERS, bypasses Supabase Auth)
    let success = await performApiLogin(page, user.email, user.password);

    if (success) {
      // Navigate to admin after API login
      await page.goto('/admin');
    } else {
      // Fall back to UI login
      success = await performLogin(page, user.email, user.password);
    }

    if (!success) {
      console.warn('Admin login failed - tests may fail if authentication is required');
    }

    await use(page);
    await context.close();
  },

  // Pre-authenticated kitchen page
  kitchenPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = TEST_USERS.kitchen;
    let success = await performApiLogin(page, user.email, user.password);

    if (success) {
      await page.goto('/cozinha');
    } else {
      success = await performLogin(page, user.email, user.password);
    }

    if (!success) {
      console.warn('Kitchen login failed - tests may fail if authentication is required');
    }

    await use(page);
    await context.close();
  },

  // Pre-authenticated waiter page
  waiterPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = TEST_USERS.waiter;
    let success = await performApiLogin(page, user.email, user.password);

    if (success) {
      await page.goto('/waiter');
    } else {
      success = await performLogin(page, user.email, user.password);
    }

    if (!success) {
      console.warn('Waiter login failed - tests may fail if authentication is required');
    }

    await use(page);
    await context.close();
  },

  // Generic authenticated page (defaults to admin)
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = TEST_USERS.admin;
    let success = await performApiLogin(page, user.email, user.password);

    if (success) {
      await page.goto('/admin');
    } else {
      await performLogin(page, user.email, user.password);
    }

    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Storage state helper - save authenticated state for reuse
 */
export async function saveStorageState(
  page: Page,
  path: string
): Promise<void> {
  await page.context().storageState({ path });
}

/**
 * Setup function to create storage states for all roles
 * Run this before tests: npx playwright test --project=setup
 */
export async function globalSetup(config: { storageStatePath: string }) {
  // This would be called by Playwright's globalSetup
  // For now, each test handles its own authentication
}
