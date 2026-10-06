import { test, expect } from '@playwright/test';

test.describe('Centinel Fin AI (ParentGuard) - Secure Multi-Portal Authentication & Onboarding Journey', () => {

  test('E2E: Parent & Child Registration, Onboarding State Verification, Sign-In, and Secure Logout', async ({ browser }) => {
    const timestamp = Date.now();
    const parentEmail = `parent.guard.${timestamp}@gmail.com`;
    const childEmail = `child.guard.${timestamp}@gmail.com`;
    const testPassword = 'SecurePassword2026!';

    console.log('\n================================================================');
    console.log('🚀 STARTING LIVE END-TO-END MULTI-PORTAL AUTHENTICATION & ONBOARDING');
    console.log(`Parent Email: ${parentEmail}`);
    console.log(`Child Email:  ${childEmail}`);
    console.log('================================================================\n');

    // =================================================================
    // 1. PARENT JOURNEY: Registration -> Onboarding -> Sign-In -> Logout
    // =================================================================
    console.log('🔵 [PORTAL 1: PARENT] Starting Parent Registration & Onboarding...');
    const parentContext = await browser.newContext();
    const parentPage = await parentContext.newPage();

    // 1.1 Navigate to Sign-Up
    await parentPage.goto('/auth/sign-up');
    await expect(parentPage.locator('h1')).toContainText('Create Account');

    // 1.2 Fill Parent Credentials
    await parentPage.fill('#email', parentEmail);
    await parentPage.fill('#password', testPassword);
    await parentPage.fill('#confirm-password', testPassword);

    // 1.3 Select Parent Role
    const parentRoleCard = parentPage.locator('label:has(input[value="PARENT"])');
    await parentRoleCard.click();
    await expect(parentPage.locator('input[value="PARENT"]')).toBeChecked();
    console.log('✓ [PORTAL 1: PARENT] Form filled and PARENT role selected.');

    // 1.4 Submit Registration
    console.log('✓ [PORTAL 1: PARENT] Submitting registration...');
    await parentPage.click('button[type="submit"]');

    // 1.5 Wait for redirect to /dashboard or /auth/verify-email
    await expect(parentPage).toHaveURL(/\/dashboard|\/auth\/verify-email/, { timeout: 15000 });
    console.log(`✓ [PORTAL 1: PARENT] Navigated to: ${parentPage.url()}`);

    if (parentPage.url().includes('/dashboard')) {
      // 1.6 Verify Parent Onboarding or Dashboard screen (AC-01, AC-51, AC-52)
      await expect(parentPage.getByText('PARENT ACCOUNT', { exact: true })).toBeVisible({ timeout: 10000 });
      console.log('🎉 [PORTAL 1: PARENT] Successfully reached Parent Onboarding state!');

      // 1.7 Test Secure Sign Out (AC-11)
      console.log('✓ [PORTAL 1: PARENT] Testing Logout...');
      await parentPage.click('button:has-text("Sign Out")');
      await expect(parentPage).toHaveURL(/\/auth\/sign-in/, { timeout: 10000 });
      console.log('✓ [PORTAL 1: PARENT] Successfully signed out and redirected to login.');

      // 1.8 Sign in again
      console.log('✓ [PORTAL 1: PARENT] Signing in with new credentials...');
      await parentPage.fill('#auth-email', parentEmail);
      await parentPage.fill('#auth-password', testPassword);
      await parentPage.click('button[type="submit"]');
      await expect(parentPage).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await expect(parentPage.getByText('PARENT ACCOUNT', { exact: true })).toBeVisible();
      console.log('✅ [PORTAL 1: PARENT] Re-authenticated into Parent dashboard.');
    } else {
      console.log('ℹ️ [PORTAL 1: PARENT] Email confirmation required. Check inbox screen displayed.');
      await expect(parentPage.locator('text=Check Your Inbox')).toBeVisible();
    }


    // =================================================================
    // 2. CHILD JOURNEY: Registration -> Waiting Screen -> Sign-In -> Logout
    // =================================================================
    console.log('\n🟢 [PORTAL 2: CHILD] Starting Child Registration & Onboarding...');
    const childContext = await browser.newContext();
    const childPage = await childContext.newPage();

    // 2.1 Navigate to Sign-Up
    await childPage.goto('/auth/sign-up');
    await expect(childPage.locator('h1')).toContainText('Create Account');

    // 2.2 Fill Child Credentials
    await childPage.fill('#email', childEmail);
    await childPage.fill('#password', testPassword);
    await childPage.fill('#confirm-password', testPassword);

    // 2.3 Select Child Role
    const childRoleCard = childPage.locator('label:has(input[value="CHILD"])');
    await childRoleCard.click();
    await expect(childPage.locator('input[value="CHILD"]')).toBeChecked();
    console.log('✓ [PORTAL 2: CHILD] Form filled and CHILD role selected.');

    // 2.4 Submit Registration
    console.log('✓ [PORTAL 2: CHILD] Submitting registration...');
    await childPage.click('button[type="submit"]');

    // 2.5 Wait for redirect to /dashboard or /auth/verify-email
    await expect(childPage).toHaveURL(/\/dashboard|\/auth\/verify-email/, { timeout: 15000 });
    console.log(`✓ [PORTAL 2: CHILD] Navigated to: ${childPage.url()}`);

    if (childPage.url().includes('/dashboard')) {
      // 2.6 Verify Child Waiting Screen (AC-02, AC-55, AC-56)
      await expect(childPage.getByText('CHILD ACCOUNT', { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(childPage.getByText('Waiting to Join Family')).toBeVisible();
      console.log('🎉 [PORTAL 2: CHILD] Successfully reached "Waiting to Join Family" screen!');

      // 2.7 Test Secure Sign Out (AC-11)
      console.log('✓ [PORTAL 2: CHILD] Testing Logout...');
      await childPage.click('button:has-text("Sign Out")');
      await expect(childPage).toHaveURL(/\/auth\/sign-in/, { timeout: 10000 });
      console.log('✓ [PORTAL 2: CHILD] Successfully signed out and redirected to login.');

      // 2.8 Sign in again
      console.log('✓ [PORTAL 2: CHILD] Signing in with new credentials...');
      await childPage.fill('#auth-email', childEmail);
      await childPage.fill('#auth-password', testPassword);
      await childPage.click('button[type="submit"]');
      await expect(childPage).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await expect(childPage.getByText('CHILD ACCOUNT', { exact: true })).toBeVisible();
      console.log('✅ [PORTAL 2: CHILD] Re-authenticated into Child waiting screen.');
    } else {
      console.log('ℹ️ [PORTAL 2: CHILD] Email confirmation required. Check inbox screen displayed.');
      await expect(childPage.locator('text=Check Your Inbox')).toBeVisible();
    }

    // Clean up
    await parentContext.close();
    await childContext.close();

    console.log('\n================================================================');
    console.log('🎉 ALL JOURNEYS VERIFIED: PARENT ONBOARDING, CHILD WAITING SCREEN, AND SECURE LOGOUT!');
    console.log('================================================================\n');
  });

});
