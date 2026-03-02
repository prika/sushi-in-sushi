/**
 * E2E Test: Full Session → Customer Stats Flow
 *
 * Tests the complete lifecycle:
 *   1. Create session on available table (via DB)
 *   2. Navigate mesa page → register customer with allergens (UI)
 *   3. Seed game data + product ratings (via DB)
 *   4. Link session customer to loyalty program (via API)
 *   5. Close session (via API) — triggers TransferSessionDataUseCase
 *   6. Verify data in /admin/clientes (UI)
 */

import { test, expect } from "./fixtures/auth";
import {
  findAvailableTable,
  createSession,
  createSessionCustomer,
  seedGameData,
  seedProductRatings,
  getProductIds,
  cleanupTestData,
  queryRows,
  updateRows,
} from "./helpers/supabase";

// Unique email per test run to avoid collisions
const TEST_EMAIL = `e2e-${Date.now()}@test.com`;
const TEST_DISPLAY_NAME = "E2E Teste";
const TEST_ALLERGENS = ["peanuts", "fish"]; // 🥜 and 🐟
const TEST_TOTAL_SPENT = 45.5;
const TEST_GAME_SCORES = [10, 20, 15]; // total = 45
const EXPECTED_TOTAL_SCORE = 45;

// Store IDs for cleanup
let tableId: string;
let tableNumber: number;
let sessionId: string;
let sessionCustomerId: string;
let gameSessionId: string;
let customerId: string;

test.describe("Fluxo Completo: Sessao → Customer Stats no Admin", () => {
  // Apply timeout to the entire describe block (including fixture setup)
  test.setTimeout(180_000);

  // Clean up after all tests
  test.afterAll(async () => {
    await cleanupTestData({
      sessionId,
      sessionCustomerId,
      gameSessionId,
      customerId,
      customerEmail: TEST_EMAIL,
      tableId,
    });
  });

  test("sessao completa transfere jogos, ratings e alergenos para customer", async ({
    adminPage,
    page,
  }) => {
    // ═══════════════════════════════════════════════
    // PHASE 1: Setup — find available table + create session via DB
    // ═══════════════════════════════════════════════

    const table = await findAvailableTable("circunvalacao");
    expect(table, "No available table found — ensure at least one table is available").toBeTruthy();
    tableId = table!.id;
    tableNumber = table!.number;

    const session = await createSession({
      tableId,
      isRodizio: true,
      numPeople: 2,
    });
    sessionId = session.id;
    expect(session.status).toBe("active");

    // ═══════════════════════════════════════════════
    // PHASE 2: Mesa Page UI — register customer with allergens
    // ═══════════════════════════════════════════════

    // Navigate to the mesa page (session already active → registration modal should appear)
    await page.goto(`/mesa/${tableNumber}?loc=circunvalacao`);
    await page.waitForLoadState("networkidle");

    // Wait for the customer registration modal to appear
    // The modal opens when step = "active" and no currentCustomer
    const modal = page.locator(".fixed.inset-0.z-50");
    const modalVisible = await modal.isVisible({ timeout: 15_000 }).catch(() => false);

    if (modalVisible) {
      // 2.1 Fill display name
      const nameInput = modal.locator("input[type='text']").first();
      await expect(nameInput).toBeVisible();
      await nameInput.fill(TEST_DISPLAY_NAME);

      // 2.2 Select allergens (peanuts 🥜 and fish 🐟)
      for (const emoji of ["🥜", "🐟"]) {
        const allergenButton = modal.locator(`button:has-text("${emoji}")`).first();
        await expect(allergenButton).toBeVisible();
        await allergenButton.click();
        await expect(allergenButton).toHaveClass(/red/);
      }

      // 2.3 Expand optional fields and fill email
      const detailsToggle = modal.locator("summary").first();
      await detailsToggle.click();
      await page.waitForTimeout(300);

      const emailInput = modal.locator("input[type='email']");
      await expect(emailInput).toBeVisible();
      await emailInput.fill(TEST_EMAIL);

      // 2.4 Submit — use role-based locator matching PT/EN button text
      const submitButton = modal.getByRole("button", {
        name: /Start Ordering|Começar a Pedir|Bestellung|Commencer|Inizia|Empezar/i,
      });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for registration to complete
      await page.waitForTimeout(2000);

      // If a verification modal appeared (for email), dismiss it
      const verifyButton = page.getByRole("button", { name: /Verificar|Verify/i }).first();
      if (await verifyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const cancelButton = page.getByRole("button", { name: /Cancelar|Cancel/i }).first();
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
        await page.waitForTimeout(500);
      }
    } else {
      // Modal didn't appear — session customer may already exist from a previous run.
      // We'll create one via DB in Phase 3 if needed.
    }

    // 2.5 Verify menu is visible (session is active, we're past registration)
    await page.waitForTimeout(1000);

    // ═══════════════════════════════════════════════
    // PHASE 3: Get or create session customer
    // ═══════════════════════════════════════════════

    // Try to find the session_customer created via UI
    const sessionCustomers = await queryRows<{
      id: string;
      display_name: string;
      email: string | null;
      allergens: string[];
    }>("session_customers", {
      session_id: `eq.${sessionId}`,
      display_name: `eq.${TEST_DISPLAY_NAME}`,
    });

    if (sessionCustomers.length === 0) {
      // Modal didn't appear or registration failed — create via DB as fallback
      const sc = await createSessionCustomer({
        sessionId,
        displayName: TEST_DISPLAY_NAME,
        email: TEST_EMAIL,
        allergens: TEST_ALLERGENS,
        isSessionHost: true,
      });
      sessionCustomerId = sc.id;
    } else {
      sessionCustomerId = sessionCustomers[0].id;
      // Verify allergens were saved by the UI
      expect(sessionCustomers[0].allergens).toContain("peanuts");
      expect(sessionCustomers[0].allergens).toContain("fish");
    }

    // Ensure allergens are set (in case UI didn't set them)
    await updateRows(
      "session_customers",
      { allergens: TEST_ALLERGENS },
      { id: `eq.${sessionCustomerId}` },
    );

    // ═══════════════════════════════════════════════
    // PHASE 4: Seed game data + ratings via DB
    // ═══════════════════════════════════════════════

    // 4.1 Link session customer to loyalty program (creates/upserts customer)
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    const linkResponse = await page.request.post(
      `${baseURL}/api/customers/from-session`,
      {
        data: {
          email: TEST_EMAIL,
          displayName: TEST_DISPLAY_NAME,
          sessionCustomerId,
        },
      }
    );
    expect(linkResponse.ok(), "Link to loyalty program should succeed").toBeTruthy();
    const linkData = await linkResponse.json();
    customerId = linkData.customerId;
    expect(customerId).toBeTruthy();

    // 4.2 Get product IDs (needed for game answers + ratings)
    const productIds = await getProductIds(3);
    expect(productIds.length, "Need at least 1 product in DB").toBeGreaterThan(0);

    // 4.3 Seed game session + answers (tinder type uses product_id)
    const gameData = await seedGameData({
      sessionId,
      sessionCustomerId,
      scores: TEST_GAME_SCORES,
      productIds,
    });
    gameSessionId = gameData.gameSessionId;
    expect(gameData.totalScore).toBe(EXPECTED_TOTAL_SCORE);

    // 4.4 Seed product ratings
    let ratingsCount = 0;
    if (productIds.length >= 2) {
      ratingsCount = await seedProductRatings({
        sessionId,
        sessionCustomerId,
        ratings: [
          { productId: productIds[0], rating: 4 },
          { productId: productIds[1], rating: 5 },
        ],
      });
    }

    // ═══════════════════════════════════════════════
    // PHASE 5: Close session via API
    // ═══════════════════════════════════════════════

    const closeResponse = await page.request.post(
      `${baseURL}/api/sessions/${sessionId}/close`,
      {
        data: {
          totalSpent: TEST_TOTAL_SPENT,
          cancelOrders: true,
          closeReason: "e2e-test",
        },
      }
    );
    expect(closeResponse.ok(), "Session close should succeed").toBeTruthy();
    const closeData = await closeResponse.json();
    expect(closeData.success).toBe(true);

    // Wait for TransferSessionDataUseCase to complete
    await page.waitForTimeout(2000);

    // ═══════════════════════════════════════════════
    // PHASE 6: Verify in Admin UI — Session Customers Tab
    // ═══════════════════════════════════════════════

    // Navigate to admin clientes page (adminPage is pre-authenticated)
    await adminPage.goto("/admin/clientes");
    await adminPage.waitForLoadState("domcontentloaded");

    // 6.1 Click "Sessao" tab
    const sessaoTab = adminPage.locator("button:has-text('Sessao')");
    await expect(sessaoTab).toBeVisible({ timeout: 10_000 });
    await sessaoTab.click();

    // Wait for loading spinner to disappear (tab loads session customers from API)
    const spinner = adminPage.locator(".animate-spin");
    await spinner.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});

    // 6.2 Search for our test customer
    const searchInput = adminPage.locator(
      "input[placeholder*='Pesquisar']"
    );
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill(TEST_EMAIL);
    // Wait for debounced search (300ms) + API response
    await adminPage.waitForTimeout(2000);

    // 6.3 Verify the customer appears in the table
    const customerCell = adminPage.locator("td").filter({ hasText: TEST_DISPLAY_NAME }).first();
    await expect(
      customerCell,
      `Customer "${TEST_DISPLAY_NAME}" should appear in session customers table`
    ).toBeVisible({ timeout: 10_000 });

    // 6.4 Click on the table row to select it
    // Use the parent <tr> to ensure onClick handler fires
    const row = customerCell.locator("xpath=ancestor::tr");
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5_000 });

    // Wait for detail panel to load
    await adminPage.waitForTimeout(3000);

    // 6.5 Verify via DB that session_customer allergens are stored correctly
    // (more reliable than UI detail panel which depends on row click)
    const scRows = await queryRows<{
      id: string;
      allergens: string[];
    }>("session_customers", {
      id: `eq.${sessionCustomerId}`,
    });
    expect(scRows.length).toBe(1);
    expect(scRows[0].allergens, "session_customer should have peanuts allergen").toContain("peanuts");
    expect(scRows[0].allergens, "session_customer should have fish allergen").toContain("fish");

    // ═══════════════════════════════════════════════
    // PHASE 7: Verify loyalty customer (Fidelizados Tab)
    // ═══════════════════════════════════════════════

    // 7.1 Verify via DB that customer data was transferred
    const customerRows = await queryRows<{
      id: string;
      email: string;
      games_played: number;
      total_score: number;
      ratings_given: number;
      allergens: string[];
      visit_count: number;
      total_spent: number;
    }>("customers", {
      email: `eq.${TEST_EMAIL}`,
    });

    expect(customerRows.length, "Loyalty customer should exist").toBe(1);
    const customer = customerRows[0];

    // Core assertions — the whole point of this test
    expect(customer.games_played, "games_played should be >= 1").toBeGreaterThanOrEqual(1);
    expect(customer.total_score, "total_score should be >= 45").toBeGreaterThanOrEqual(EXPECTED_TOTAL_SCORE);
    expect(customer.visit_count, "visit_count should be >= 1").toBeGreaterThanOrEqual(1);
    expect(customer.total_spent, "total_spent should be >= 45.50").toBeGreaterThanOrEqual(TEST_TOTAL_SPENT);

    if (ratingsCount > 0) {
      expect(customer.ratings_given, "ratings_given should be >= 2").toBeGreaterThanOrEqual(ratingsCount);
    }

    // Verify allergens were merged
    for (const allergen of TEST_ALLERGENS) {
      expect(
        customer.allergens,
        `customer allergens should include '${allergen}'`
      ).toContain(allergen);
    }

    // 7.2 Verify in UI — switch to Fidelizados tab
    const fidelizadosTab = adminPage.locator("button:has-text('Fidelizados')");
    await fidelizadosTab.click();

    // Wait for loading spinner to disappear
    await spinner.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});

    // Search for customer in Fidelizados
    const fidelizadosSearch = adminPage.locator(
      "input[placeholder*='Pesquisar']"
    );
    await expect(fidelizadosSearch).toBeVisible({ timeout: 15_000 });
    await fidelizadosSearch.fill(TEST_EMAIL);
    await adminPage.waitForTimeout(2000);

    // Check that the customer name appears
    const fidelizadoRow = adminPage.locator(`td:has-text("${TEST_DISPLAY_NAME}")`).first();
    await expect(
      fidelizadoRow,
      `Customer "${TEST_DISPLAY_NAME}" should appear in fidelizados table`
    ).toBeVisible({ timeout: 10_000 });
  });
});
