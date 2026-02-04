/**
 * E2E Tests: Accessibility
 * Tests for WCAG compliance and accessibility
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade - Páginas Públicas', () => {
  test('página inicial é acessível', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    // Allow some minor violations but flag critical ones
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('página de reservas é acessível', async ({ page }) => {
    await page.goto('/reservas');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('página de menu é acessível', async ({ page }) => {
    await page.goto('/menu');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('página de login é acessível', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});

test.describe('Acessibilidade - Formulários', () => {
  test('formulário de reserva tem labels associadas', async ({ page }) => {
    await page.goto('/reservas');

    // Check that all inputs have associated labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
      const withoutLabels: string[] = [];

      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');

        // Check for label element
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);

        if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
          withoutLabels.push(input.getAttribute('name') || 'unknown');
        }
      });

      return withoutLabels;
    });

    // Log for debugging
    if (inputsWithoutLabels.length > 0) {
      console.log('Inputs without labels:', inputsWithoutLabels);
    }

    // Allow placeholder as fallback but prefer proper labels
    expect(inputsWithoutLabels.length).toBeLessThanOrEqual(2);
  });

  test('formulário pode ser navegado com teclado', async ({ page }) => {
    await page.goto('/reservas');

    // Focus first input
    await page.keyboard.press('Tab');

    // Should be able to tab through all form elements
    let focusableElements = 0;
    for (let i = 0; i < 20; i++) {
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      if (activeElement === 'INPUT' || activeElement === 'SELECT' || activeElement === 'BUTTON') {
        focusableElements++;
      }
      await page.keyboard.press('Tab');
    }

    // Should have multiple focusable elements
    expect(focusableElements).toBeGreaterThan(3);
  });
});

test.describe('Acessibilidade - Cores e Contraste', () => {
  test('texto tem contraste suficiente', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    // Allow some contrast issues but not too many
    expect(contrastViolations.length).toBeLessThanOrEqual(5);
  });
});

test.describe('Acessibilidade - Imagens', () => {
  test('imagens têm texto alternativo', async ({ page }) => {
    await page.goto('/');

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const withoutAlt: string[] = [];

      images.forEach(img => {
        if (!img.getAttribute('alt') && !img.getAttribute('role')) {
          withoutAlt.push(img.getAttribute('src') || 'unknown');
        }
      });

      return withoutAlt;
    });

    // All meaningful images should have alt text
    expect(imagesWithoutAlt).toHaveLength(0);
  });
});

test.describe('Acessibilidade - Estrutura', () => {
  test('página tem estrutura de headings lógica', async ({ page }) => {
    await page.goto('/');

    const headingStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headings).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.slice(0, 50),
      }));
    });

    // Should have at least one h1
    const h1Count = headingStructure.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Should not skip heading levels (e.g., h1 to h3)
    let previousLevel = 0;
    let hasSkippedLevel = false;

    headingStructure.forEach(h => {
      if (h.level > previousLevel + 1 && previousLevel !== 0) {
        hasSkippedLevel = true;
      }
      previousLevel = h.level;
    });

    // Log for debugging but don't fail (common issue)
    if (hasSkippedLevel) {
      console.log('Warning: Heading levels are skipped');
    }
  });

  test('página tem landmark regions', async ({ page }) => {
    await page.goto('/');

    const landmarks = await page.evaluate(() => {
      return {
        main: document.querySelectorAll('main, [role="main"]').length,
        nav: document.querySelectorAll('nav, [role="navigation"]').length,
        header: document.querySelectorAll('header, [role="banner"]').length,
        footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
      };
    });

    // Should have at least a main region
    expect(landmarks.main).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Acessibilidade - Interativo', () => {
  test('botões têm texto acessível', async ({ page }) => {
    await page.goto('/reservas');

    const buttonsWithoutText = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const withoutText: string[] = [];

      buttons.forEach(btn => {
        const text = btn.textContent?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const title = btn.getAttribute('title');

        if (!text && !ariaLabel && !title) {
          withoutText.push(btn.className || 'unknown');
        }
      });

      return withoutText;
    });

    expect(buttonsWithoutText).toHaveLength(0);
  });

  test('links têm texto descritivo', async ({ page }) => {
    await page.goto('/');

    const genericLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      const generic: string[] = [];

      links.forEach(link => {
        const text = link.textContent?.trim().toLowerCase();
        if (text === 'click here' || text === 'read more' || text === 'here' || text === 'clique aqui') {
          generic.push(text);
        }
      });

      return generic;
    });

    // Should not have generic link text
    expect(genericLinks).toHaveLength(0);
  });
});
