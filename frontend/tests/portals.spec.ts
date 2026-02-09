import { test, expect } from '@playwright/test';
import { loginAs, clearAuthState, waitForPageReady, clickAndWait } from './helpers';

test.describe('Super Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'super_admin');
    await waitForPageReady(page);
  });

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
    const dashboard = page.locator('[class*="dashboard"], main');
    await expect(dashboard).toBeVisible();
  });

  test('should navigate to Applications page', async ({ page }) => {
    await page.getByRole('link', { name: /applications/i }).click();
    await expect(page).toHaveURL(/\/super\/applications/);
    await waitForPageReady(page);
  });

  test('should navigate to Enterprises page', async ({ page }) => {
    await page.getByRole('link', { name: /enterprises/i }).click();
    await expect(page).toHaveURL(/\/super\/enterprises/);
    await waitForPageReady(page);
  });

  test('should navigate to Pickups page', async ({ page }) => {
    await page.getByRole('link', { name: /pickups/i }).click();
    await expect(page).toHaveURL(/\/super\/pickups/);
    await waitForPageReady(page);
  });

  test('should navigate to Pricing page', async ({ page }) => {
    await page.getByRole('link', { name: /pricing/i }).click();
    await expect(page).toHaveURL(/\/super\/pricing/);
    await waitForPageReady(page);
  });

  test('should navigate to Analytics page', async ({ page }) => {
    await page.getByRole('link', { name: /analytics/i }).click();
    await expect(page).toHaveURL(/\/super\/analytics/);
    await waitForPageReady(page);
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/super\/settings/);
    await waitForPageReady(page);
  });
});

test.describe('OPS Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'ops_admin');
    await waitForPageReady(page);
  });

  test('should display operations dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/ops/);
    await waitForPageReady(page);
  });

  test('should navigate to Applications page', async ({ page }) => {
    await page.getByRole('link', { name: /applications/i }).click();
    await expect(page).toHaveURL(/\/ops\/applications/);
    await waitForPageReady(page);
  });

  test('should navigate to Enterprises page', async ({ page }) => {
    await page.getByRole('link', { name: /enterprises/i }).click();
    await expect(page).toHaveURL(/\/ops\/enterprises/);
    await waitForPageReady(page);
  });

  test('should navigate to Logistics page', async ({ page }) => {
    await page.getByRole('link', { name: /logistics/i }).click();
    await expect(page).toHaveURL(/\/ops\/logistics/);
    await waitForPageReady(page);
  });
});

test.describe('IT Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'it_admin');
    await waitForPageReady(page);
  });

  test('should display IT Admin dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: /IT Admin/i })).toBeVisible();
  });

  test('should navigate to Batches page', async ({ page }) => {
    await page.getByRole('link', { name: /batches/i }).click();
    await expect(page).toHaveURL(/\/admin\/batches/);
    await waitForPageReady(page);
  });

  test('should navigate to Assets page', async ({ page }) => {
    await page.getByRole('link', { name: /assets/i }).click();
    await expect(page).toHaveURL(/\/admin\/assets/);
    await waitForPageReady(page);
  });

  test('should navigate to Employees page', async ({ page }) => {
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page).toHaveURL(/\/admin\/employees/);
    await waitForPageReady(page);
  });

  test('should navigate to Pickups page', async ({ page }) => {
    await page.getByRole('link', { name: /pickups/i }).click();
    await expect(page).toHaveURL(/\/admin\/pickups/);
    await waitForPageReady(page);
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/admin\/settings/);
    await waitForPageReady(page);
  });

  test('should open Add Asset form', async ({ page }) => {
    await page.getByRole('link', { name: /assets/i }).click();
    await expect(page).toHaveURL(/\/admin\/assets/);
    await waitForPageReady(page);

    const addButton = page.getByRole('button', { name: /add asset/i }).first();
    await addButton.click();
    await expect(page).toHaveURL(/\/admin\/assets\/(new|add)/);
  });

  test('should open Create Batch form', async ({ page }) => {
    await page.getByRole('link', { name: /batches/i }).click();
    await expect(page).toHaveURL(/\/admin\/batches/);
    await waitForPageReady(page);

    const createButton = page.getByRole('button', { name: /create batch/i }).first();
    await createButton.click();
    await expect(page).toHaveURL(/\/admin\/batches\/new/);
  });

  test('should open Invite Employee form', async ({ page }) => {
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page).toHaveURL(/\/admin\/employees/);
    await waitForPageReady(page);

    const inviteButton = page.getByRole('button', { name: /invite/i }).first();
    await inviteButton.click();
    await expect(page).toHaveURL(/\/admin\/employees\/invite/);
  });
});

test.describe('Org Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'org_admin');
    await waitForPageReady(page);
  });

  test('should display Org Admin dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/org-admin/);
  });

  // Org Admin uses dropdown menus - click dropdown first, then link
  test('should navigate to Branches via Organization dropdown', async ({ page }) => {
    // Click Organization dropdown
    await page.getByRole('button', { name: /organization/i }).click();
    await page.getByRole('link', { name: /branches/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/branches/);
    await waitForPageReady(page);
  });

  test('should navigate to IT Admins via Organization dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /organization/i }).click();
    await page.getByRole('link', { name: /it admins/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/it-admins/);
    await waitForPageReady(page);
  });

  test('should navigate to Batch Approvals via Assets dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /assets.*batches/i }).click();
    // Look for approvals link
    const approvalsLink = page.getByRole('link', { name: /approvals/i });
    if (await approvalsLink.isVisible()) {
      await approvalsLink.click();
      await expect(page).toHaveURL(/\/org-admin\/approvals/);
    }
  });

  test('should navigate to Wallet via Finance dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /finance/i }).click();
    await page.getByRole('link', { name: /wallet/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/wallet/);
    await waitForPageReady(page);
  });

  test('should navigate to Reports via Finance dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /finance/i }).click();
    await page.getByRole('link', { name: /reports/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/reports/);
    await waitForPageReady(page);
  });

  test('should navigate to EPR via Finance dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /finance/i }).click();
    await page.getByRole('link', { name: /epr/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/epr/);
    await waitForPageReady(page);
  });
});

test.describe.skip('Sub-User (Employee) Portal', () => {
  // SKIP: Employees require OTP login flow, not password login
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'employee');
    await waitForPageReady(page);
  });

  test('should display employee dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/check-in/);
  });

  test('should navigate to Submit Device page', async ({ page }) => {
    const submitLink = page.getByRole('link', { name: /submit device/i });
    if (await submitLink.isVisible()) {
      await submitLink.click();
      await expect(page).toHaveURL(/\/check-in\/submit/);
    }
  });

  test('should navigate to Help page', async ({ page }) => {
    await page.getByRole('link', { name: /help/i }).click();
    await expect(page).toHaveURL(/\/check-in\/help/);
    await waitForPageReady(page);
  });
});

test.describe('Logistics Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'logistics_admin');
    await waitForPageReady(page);
  });

  test('should display Logistics Admin dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/logistics-admin/);
  });

  test('should navigate to Assignments page', async ({ page }) => {
    await page.getByRole('link', { name: /assignments/i }).click();
    await expect(page).toHaveURL(/\/logistics-admin\/assignments/);
    await waitForPageReady(page);
  });

  test('should navigate to Users page', async ({ page }) => {
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page).toHaveURL(/\/logistics-admin\/users/);
    await waitForPageReady(page);
  });
});

test.describe('Logistics User Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'logistics_user');
    await waitForPageReady(page);
  });

  test('should display Logistics User dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/logistics/);
  });
});
