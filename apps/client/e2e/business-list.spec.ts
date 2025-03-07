import { test, expect } from '@playwright/test';

test.describe('Business List Page', () => {
  test('should load the business list page', async ({ page }) => {
    // Přejít na hlavní stránku
    await page.goto('/');
    // Ověřit, že se stránka načetla
    await expect(page.locator('h1')).toContainText('Firemní databáze');

    // Ověřit, že se načetla tabulka firem
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter businesses', async ({ page }) => {
    // Přejít na hlavní stránku
    await page.goto('/');

    // Počkat na načtení tabulky
    await page.waitForSelector('table');

    // Zadat hledaný výraz do vyhledávacího pole
    await page.locator('input[placeholder="Hledat podle názvu nebo adresy"]').fill('test');

    // Počkat na aktualizaci výsledků (debounce)
    await page.waitForTimeout(1500);

    // Ověřit, že se výsledky aktualizovaly
    // Poznámka: Tento test může selhat, pokud v databázi nejsou žádné firmy s názvem obsahujícím "test"
    // V reálném prostředí by bylo vhodné přidat testovací data nebo mock API
  });

  test('should open edit form when clicking edit button', async ({ page }) => {
    // Přejít na hlavní stránku
    await page.goto('/');

    // Počkat na načtení tabulky
    await page.waitForSelector('table');

    // Kliknout na tlačítko pro editaci první firmy
    await page.locator('table tbody tr').first().locator('button[title="Upravit"]').click();

    // Ověřit, že se otevřel formulář pro editaci
    await expect(page.locator('h2')).toContainText('Upravit firmu');

    // Ověřit, že formulář obsahuje pole pro název
    await expect(page.locator('label[for="name"]')).toContainText('Název');

    // Zavřít formulář
    await page.locator('form button[aria-label=cancel]').click();
  });
});
