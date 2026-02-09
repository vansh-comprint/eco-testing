import { Page, expect } from '@playwright/test';

// Test user credentials - from seed_demo_accounts.py
// All demo accounts use password: Demo@123456
export const TEST_USERS = {
  super_admin: {
    email: 'demo.superadmin@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/super',
  },
  ops_admin: {
    email: 'demo.opsadmin@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/ops',
  },
  org_admin: {
    email: 'demo.orgadmin@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/org-admin',
  },
  it_admin: {
    email: 'demo.itadmin@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/admin',
  },
  employee: {
    email: 'demo.employee@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/check-in',
  },
  logistics_admin: {
    email: 'demo.logisticsadmin@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/logistics-admin',
  },
  logistics_user: {
    email: 'demo.logisticsuser@ecotribe.com',
    password: 'Demo@123456',
    expectedPath: '/logistics',
  },
};

export type UserRole = keyof typeof TEST_USERS;

/**
 * Login as a specific user role
 * Handles rate limiting with automatic retry
 */
export async function loginAs(page: Page, role: UserRole, maxRetries = 3) {
  const user = TEST_USERS[role];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Go to login page
    await page.goto('/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in credentials using data-testid
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);

    // Click submit
    await page.getByTestId('login-submit').click();

    // Check for rate limit error and retry if needed
    try {
      // Try to navigate - if it works, login succeeded
      await page.waitForURL(`**${user.expectedPath}**`, { timeout: 10000 });
      return user;
    } catch {
      // Check if rate limited
      const errorText = await page.locator('[class*="error"], [class*="alert"]').textContent().catch(() => '');
      if (errorText?.includes('Rate limit') && attempt < maxRetries) {
        // Extract wait time from error message (e.g., "Please try again in 41 seconds")
        const match = errorText.match(/(\d+)\s*seconds?/);
        const waitTime = match ? parseInt(match[1]) * 1000 + 1000 : 15000;
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${attempt + 1}/${maxRetries}`);
        await page.waitForTimeout(waitTime);
        continue;
      }
      throw new Error(`Login failed for ${role}: ${errorText || 'Navigation timeout'}`);
    }
  }

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
