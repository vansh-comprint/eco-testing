import { Page, expect } from '@playwright/test';

// Test user credentials - these should match the backend seeded users
// From seed_test_data.py
export const TEST_USERS = {
  super_admin: {
    email: 'superadmin@ecotribe.io',
    password: 'password123',
    expectedPath: '/super',
  },
  ops_admin: {
    email: 'opsadmin@ecotribe.io',
    password: 'password123',
    expectedPath: '/ops',
  },
  org_admin: {
    email: 'orgadmin@techcorp.com',
    password: 'password123',
    expectedPath: '/org-admin',
  },
  it_admin: {
    email: 'itadmin@techcorp.com',
    password: 'password123',
    expectedPath: '/admin',
  },
  employee: {
    email: 'employee@techcorp.com',
    password: 'password123',
    expectedPath: '/check-in',
  },
  logistics_admin: {
    email: 'logisticsadmin@express.com',
    password: 'password123',
    expectedPath: '/logistics-admin',
  },
  logistics_user: {
    email: 'driver@express.com',
    password: 'password123',
    expectedPath: '/logistics',
  },
};

export type UserRole = keyof typeof TEST_USERS;

/**
 * Login as a specific user role
 */
export async function loginAs(page: Page, role: UserRole) {
  const user = TEST_USERS[role];

  // Go to login page
  await page.goto('/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials using data-testid
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);

  // Click submit
  await page.getByTestId('login-submit').click();

  // Wait for navigation to expected path
  await page.waitForURL(`**${user.expectedPath}**`, { timeout: 15000 });

  return user;
}

/**
 * Login with custom credentials
 */
export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Look for logout button in sidebar or header
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }

  // Wait for redirect to login
  await page.waitForURL('**/login**');
}

/**
 * Clear auth state from localStorage
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('ecotribe_access_token');
    localStorage.removeItem('ecotribe_refresh_token');
    localStorage.removeItem('ecotribe-auth-api');
  });
}

/**
 * Set auth tokens directly (for bypassing login)
 */
export async function setAuthTokens(page: Page, accessToken: string, refreshToken?: string) {
  await page.evaluate(({ access, refresh }) => {
    localStorage.setItem('ecotribe_access_token', access);
    if (refresh) {
      localStorage.setItem('ecotribe_refresh_token', refresh);
    }
  }, { access: accessToken, refresh: refreshToken });
}

/**
 * Wait for page to be fully loaded and interactive
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Brief pause to let initial render complete
  await page.waitForTimeout(500);
}

/**
 * Check if an element is clickable (visible and not disabled)
 */
export async function isClickable(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const isVisible = await element.isVisible();
  const isEnabled = await element.isEnabled();
  return isVisible && isEnabled;
}

/**
 * Click a button and wait for navigation or response
 */
export async function clickAndWait(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toBeEnabled();
  await element.click();
}
