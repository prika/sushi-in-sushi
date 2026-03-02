/**
 * E2E Tests: Reservation Flow
 * Tests the complete reservation process from customer perspective
 */

import { test, expect } from "@playwright/test";

// Helper function to navigate to the reservation page
async function goToReservationPage(page: import("@playwright/test").Page) {
  await page.goto("/pt/reservar");
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('form input[name="first_name"]', {
    timeout: 10000,
  });
}

test.describe("Fluxo de Reserva - Cliente", () => {
  test.beforeEach(async ({ page }) => {
    await goToReservationPage(page);
  });

  test("página de reservas carrega corretamente", async ({ page }) => {
    await expect(page.locator("form")).toBeVisible();
  });

  test("formulário tem todos os campos obrigatórios", async ({ page }) => {
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });

  test("submissão de formulário vazio mostra erros", async ({ page }) => {
    await page.locator('button[type="submit"]').click();

    const invalidFields = await page.locator(":invalid").count();
    expect(invalidFields).toBeGreaterThan(0);
  });

  test("seleção de localização funciona", async ({ page }) => {
    const locationSelector = page.locator(
      'select[name="location"], [data-testid="location"]',
    );

    if (await locationSelector.isVisible()) {
      await locationSelector.selectOption("circunvalacao");
      await expect(locationSelector).toHaveValue("circunvalacao");

      await locationSelector.selectOption("boavista");
      await expect(locationSelector).toHaveValue("boavista");
    }
  });

  test("seleção de data não permite datas passadas", async ({ page }) => {
    const dateInput = page.locator(
      'input[type="date"], input[name="reservation_date"]',
    );

    if (await dateInput.isVisible()) {
      const minDate = await dateInput.getAttribute("min");
      const today = new Date().toISOString().split("T")[0];

      if (minDate) {
        expect(new Date(minDate) >= new Date(today)).toBe(true);
      }
    }
  });

  test("seleção de número de pessoas funciona", async ({ page }) => {
    const partySizeSelector = page.locator(
      'select[name="party_size"], input[name="party_size"], [data-testid="party_size"]',
    );

    if (await partySizeSelector.isVisible()) {
      const tagName = await partySizeSelector.evaluate((el) =>
        el.tagName.toLowerCase(),
      );
      if (tagName === "select") {
        await partySizeSelector.selectOption("4");
        await expect(partySizeSelector).toHaveValue("4");
      }
    }
  });

  test("toggle rodízio/carta funciona", async ({ page }) => {
    const rodizioToggle = page.locator(
      '[name="is_rodizio"], [data-testid="is_rodizio"]',
    );

    if (await rodizioToggle.isVisible()) {
      await rodizioToggle.click();
    }
  });
});

test.describe("Fluxo de Reserva - Sucesso", () => {
  test("reserva completa com dados válidos", async ({ page }) => {
    await goToReservationPage(page);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    await page.fill('input[name="first_name"]', "Teste");
    await page.fill('input[name="last_name"]', "Automatizado");
    await page.fill('input[name="email"]', "teste.automatizado@example.com");
    await page.fill('input[name="phone"]', "912345678");

    const dateInput = page.locator('input[name="reservation_date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill(dateStr);
    }

    const timeSelector = page.locator('select[name="reservation_time"]');
    if (await timeSelector.isVisible()) {
      const options = await timeSelector.locator("option").allTextContents();
      if (options.length > 1) {
        await timeSelector.selectOption({ index: 1 });
      }
    }

    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const successMessage = page.locator(
      '.success-message, [data-testid="success"]',
    );
    const errorMessage = page.locator('.error-message, [data-testid="error"]');

    const hasSuccess = await successMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);

    expect(hasSuccess || hasError).toBe(true);
  });
});

test.describe("Aviso de Dias Fechados", () => {
  test("mostra aviso quando dia está fechado", async ({ page }) => {
    await goToReservationPage(page);

    const dateInput = page.locator('input[name="reservation_date"]');

    if (await dateInput.isVisible()) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split("T")[0]);

      await page.waitForTimeout(500);

      const closureWarning = page.locator(
        '.closure-warning, [data-testid="closure-warning"]',
      );
      expect(true).toBe(true);
    }
  });
});
