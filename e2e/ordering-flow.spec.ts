/**
 * E2E Tests: Table Ordering Flow
 * Tests the QR code ordering process
 */

import { test, expect } from '@playwright/test';

test.describe('Pedido via Mesa - Fluxo Básico', () => {
  test.beforeEach(async ({ page }) => {
    // Go to table 1 ordering page
    await page.goto('/mesa/1');
  });

  test('página de pedido carrega', async ({ page }) => {
    // Should show ordering interface
    const hasOrderingUI = await page.locator('main').isVisible();
    expect(hasOrderingUI).toBe(true);
  });

  test('menu de produtos é visível', async ({ page }) => {
    // Look for product list or categories
    const hasProducts = await page.locator('.products, .menu, [data-testid="menu"]').isVisible().catch(() => false);
    const hasCategories = await page.locator('.categories, [data-testid="categories"]').isVisible().catch(() => false);

    expect(hasProducts || hasCategories).toBe(true);
  });

  test('categorias são clicáveis', async ({ page }) => {
    const categoryButton = page.locator('.category, [data-testid="category"]').first();

    if (await categoryButton.isVisible()) {
      await categoryButton.click();

      // Should filter or show category products
      await page.waitForTimeout(300);
    }
  });

  test.skip('pode adicionar produto ao carrinho', async ({ page }) => {
    // Find add to cart button
    const addButton = page.locator('[data-testid="add-to-cart"], button:has-text("Adicionar")').first();

    if (await addButton.isVisible()) {
      const initialCartCount = await page.locator('[data-testid="cart-count"]').textContent().catch(() => '0');

      await addButton.click();

      // Cart count should increase
      await page.waitForTimeout(300);
      const newCartCount = await page.locator('[data-testid="cart-count"]').textContent().catch(() => '0');

      expect(parseInt(newCartCount || '0')).toBeGreaterThan(parseInt(initialCartCount || '0'));
    }
  });

  test.skip('pode ver carrinho', async ({ page }) => {
    // Open cart
    const cartButton = page.locator('[data-testid="cart-button"], .cart-icon').first();

    if (await cartButton.isVisible()) {
      await cartButton.click();

      // Cart drawer/modal should open
      const cartDrawer = page.locator('[data-testid="cart-drawer"], .cart-drawer, .cart-modal');
      await expect(cartDrawer).toBeVisible();
    }
  });

  test.skip('pode alterar quantidade no carrinho', async ({ page }) => {
    // Add item first
    const addButton = page.locator('[data-testid="add-to-cart"]').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    // Open cart
    const cartButton = page.locator('[data-testid="cart-button"]').first();
    if (await cartButton.isVisible()) {
      await cartButton.click();
    }

    // Find quantity controls
    const increaseButton = page.locator('[data-testid="increase-qty"], button:has-text("+")').first();
    if (await increaseButton.isVisible()) {
      await increaseButton.click();

      // Quantity should increase
    }
  });

  test.skip('pode remover item do carrinho', async ({ page }) => {
    // Add item first
    const addButton = page.locator('[data-testid="add-to-cart"]').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    // Open cart
    const cartButton = page.locator('[data-testid="cart-button"]').first();
    if (await cartButton.isVisible()) {
      await cartButton.click();
    }

    // Find remove button
    const removeButton = page.locator('[data-testid="remove-item"], button:has-text("Remover")').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Item should be removed
    }
  });
});

test.describe('Pedido via Mesa - Sessão', () => {
  test.skip('pode iniciar sessão', async ({ page }) => {
    await page.goto('/mesa/1');

    // Find start session button
    const startButton = page.locator('[data-testid="start-session"], button:has-text("Iniciar")');

    if (await startButton.isVisible()) {
      await startButton.click();

      // Session configuration should appear
    }
  });

  test.skip('pode escolher modo rodízio ou carta', async ({ page }) => {
    await page.goto('/mesa/1');

    // Find mode selection
    const rodizioOption = page.locator('[data-testid="rodizio-option"], button:has-text("Rodízio")');
    const cartaOption = page.locator('[data-testid="carta-option"], button:has-text("Carta")');

    if (await rodizioOption.isVisible()) {
      await rodizioOption.click();
    }
  });

  test.skip('pode registar nome do participante', async ({ page }) => {
    await page.goto('/mesa/1');

    // Find name input
    const nameInput = page.locator('input[name="display_name"], [data-testid="participant-name"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill('Teste');
    }
  });
});

test.describe('Pedido via Mesa - Chamada de Empregado', () => {
  test.skip('pode chamar empregado', async ({ page }) => {
    await page.goto('/mesa/1');

    // Find call waiter button
    const callButton = page.locator('[data-testid="call-waiter"], button:has-text("Chamar")');

    if (await callButton.isVisible()) {
      await callButton.click();

      // Confirmation should appear
      await page.waitForTimeout(500);
    }
  });

  test.skip('pode pedir conta', async ({ page }) => {
    await page.goto('/mesa/1');

    // Find request bill button
    const billButton = page.locator('[data-testid="request-bill"], button:has-text("Conta")');

    if (await billButton.isVisible()) {
      await billButton.click();

      // Confirmation should appear
    }
  });
});
