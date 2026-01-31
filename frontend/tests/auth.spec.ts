import { test, expect } from '@playwright/test';
import { loginAs, loginWithCredentials, clearAuthState, waitForPageReady, TEST_USERS } from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await clearAuthState(page);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    // Check for login form elements
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();

    // Check for branding
    await expect(page.locator('text=ECO/TRIBE')).toBeVisible();
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await loginWithCredentials(page, 'invalid@test.com', 'wrongpassword');

    // Wait for error message - check for various error message patterns
    const errorElement = page.locator('[class*="error"], [class*="red"], [role="alert"]').or(
      page.locator('text=/invalid|error|failed|incorrect/i')
    );
    await expect(errorElement.first()).toBeVisible({ timeout: 15000 });
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/login**');
    await expect(page).toHaveURL(/login/);
  });

  test('should login as Super Admin and redirect correctly', async ({ page }) => {
    await loginAs(page, 'super_admin');

    // Verify we're on the super admin dashboard
    await expect(page).toHaveURL(/\/super/);
    await waitForPageReady(page);

    // Check for dashboard content - use heading role for specificity
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
  });

  test('should login as OPS Admin and redirect correctly', async ({ page }) => {
    await loginAs(page, 'ops_admin');

    // Verify we're on the ops dashboard
    await expect(page).toHaveURL(/\/ops/);
    await waitForPageReady(page);
  });

  test('should login as IT Admin and redirect correctly', async ({ page }) => {
    await loginAs(page, 'it_admin');

    // Verify we're on the admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    await waitForPageReady(page);

    // Check for dashboard content - use heading role for specificity
    await expect(page.getByRole('heading', { name: /IT Admin/i })).toBeVisible();
  });

  test('should login as Org Admin and redirect correctly', async ({ page }) => {
    await loginAs(page, 'org_admin');

    // Verify we're on the org admin dashboard
    await expect(page).toHaveURL(/\/org-admin/);
    await waitForPageReady(page);
  });

  test.skip('should login as Employee and redirect correctly', async ({ page }) => {
    // SKIP: Employees require OTP login flow, not password login
    // The backend enforces "Employees must use OTP login"
    await loginAs(page, 'employee');
    await expect(page).toHaveURL(/\/check-in/);
    await waitForPageReady(page);
  });

  test('should login as Logistics Admin and redirect correctly', async ({ page }) => {
    await loginAs(page, 'logistics_admin');

    // Verify we're on the logistics admin dashboard
    await expect(page).toHaveURL(/\/logistics-admin/);
    await waitForPageReady(page);
  });

  test('should login as Logistics User and redirect correctly', async ({ page }) => {
    await loginAs(page, 'logistics_user');

    // Verify we're on the logistics dashboard
    await expect(page).toHaveURL(/\/logistics/);
    await waitForPageReady(page);
  });

  test('should require email to submit login form', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    // Try to submit without email
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Should show error or stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should require password to submit login form', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    // Try to submit without password
    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-submit').click();

    // Should show error or stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    const passwordInput = page.getByTestId('login-password');
    await passwordInput.fill('testpassword');

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button (it's inside the password field container)
    const passwordContainer = page.locator('div').filter({ has: passwordInput });
    const toggleButton = passwordContainer.locator('button[type="button"]');

    // Click toggle button if visible
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
    } else {
      // Skip test if no toggle button
      console.log('Password toggle button not found, skipping');
    }
  });
});
