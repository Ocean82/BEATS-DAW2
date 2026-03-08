import { test, expect } from '@playwright/test';

test.describe('App flow', () => {
  test('loads app and shows stem splitter with 2/4 stem choice', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByText('Split to stems')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/Choose 2 or 4 stems/)).toBeVisible();

    const stemSelect = page.getByRole('combobox', { name: /choose 2 or 4 stems/i });
    await expect(stemSelect).toBeVisible();
    await expect(stemSelect).toHaveValue('4');

    await stemSelect.selectOption('2');
    await expect(stemSelect).toHaveValue('2');

    await stemSelect.selectOption('4');
    await expect(stemSelect).toHaveValue('4');
  });

  test('file input and split button are present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByText('Split to stems')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByLabel(/audio file for stem split/i)).toBeVisible();
    const splitButton = page.getByRole('button', { name: 'Split', exact: true });
    await expect(splitButton).toBeVisible();
    await expect(splitButton).toBeDisabled();
  });
});
