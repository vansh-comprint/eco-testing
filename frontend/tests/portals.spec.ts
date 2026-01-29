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
    // Use heading role for specificity (multiple elements have "Super Admin" text)
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
    // Check for dashboard elements
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

  test('should navigate to Admins page', async ({ page }) => {
    await page.getByRole('link', { name: /admins/i }).click();
    await expect(page).toHaveURL(/\/super\/admins/);
    await waitForPageReady(page);
  });

  test('should navigate to Logistics page', async ({ page }) => {
    await page.getByRole('link', { name: /logistics/i }).click();
    await expect(page).toHaveURL(/\/super\/logistics/);
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
    await loginAs(page, 'main_admin');
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
    // Use heading role for specificity
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

  test('should navigate to Sub-Users page', async ({ page }) => {
    await page.getByRole('link', { name: /sub-users/i }).click();
    await expect(page).toHaveURL(/\/admin\/sub-users/);
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

    // Click Add Asset button (use first() to handle mobile/desktop versions)
    const addButton = page.getByRole('button', { name: /add asset/i }).first();
    await addButton.click();
    await expect(page).toHaveURL(/\/admin\/assets\/(new|add)/);
  });

  test('should open Create Batch form', async ({ page }) => {
    await page.getByRole('link', { name: /batches/i }).click();
    await expect(page).toHaveURL(/\/admin\/batches/);
    await waitForPageReady(page);

    // Click Create Batch button (use first() to handle mobile/desktop versions)
    const createButton = page.getByRole('button', { name: /create batch/i }).first();
    await createButton.click();
    await expect(page).toHaveURL(/\/admin\/batches\/new/);
  });

  test('should open Invite User form', async ({ page }) => {
    await page.getByRole('link', { name: /sub-users/i }).click();
    await expect(page).toHaveURL(/\/admin\/sub-users/);
    await waitForPageReady(page);

    // Click Invite User button (use first() to handle mobile/desktop versions)
    const inviteButton = page.getByRole('button', { name: /invite/i }).first();
    await inviteButton.click();
    await expect(page).toHaveURL(/\/admin\/sub-users\/invite/);
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

  test('should navigate to Branches page', async ({ page }) => {
    await page.getByRole('link', { name: /branches/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/branches/);
    await waitForPageReady(page);
  });

  test('should navigate to IT Admins page', async ({ page }) => {
    await page.getByRole('link', { name: /it admins/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/it-admins/);
    await waitForPageReady(page);
  });

  test('should navigate to Pickup Approvals page', async ({ page }) => {
    await page.getByRole('link', { name: /pickup approvals|approvals/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/approvals/);
    await waitForPageReady(page);
  });

  test('should navigate to Wallet page', async ({ page }) => {
    await page.getByRole('link', { name: /wallet/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/wallet/);
    await waitForPageReady(page);
  });

  test('should navigate to Reports page', async ({ page }) => {
    await page.getByRole('link', { name: /reports/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/reports/);
    await waitForPageReady(page);
  });

  test('should navigate to EPR Certificates page', async ({ page }) => {
    await page.getByRole('link', { name: /epr/i }).click();
    await expect(page).toHaveURL(/\/org-admin\/epr/);
    await waitForPageReady(page);
  });
});

test.describe.skip('Sub-User (Employee) Portal', () => {
  // SKIP: Sub Users (employees) require OTP login flow, not password login
  // The backend enforces "Employees must use OTP login"
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuthState(page);
    await loginAs(page, 'sub_user');
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
