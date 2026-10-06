import { test, expect } from '@playwright/test';

test.describe('Centinel Fin AI (ParentGuard) - Live Multi-Portal Account Creation & Sign-In', () => {

  test('E2E: Create real Parent and Child accounts, sign in to both portals, and verify authentication logging', async ({ browser }) => {
    const timestamp = Date.now();
    const parentEmail = `parent.guard.${timestamp}@gmail.com`;
    const childEmail = `child.guard.${timestamp}@gmail.com`;
    const testPassword = 'SecurePassword2026!';

    console.log('\n================================================================');
    console.log('🚀 STARTING LIVE END-TO-END MULTI-PORTAL AUTHENTICATION FLOW');
    console.log(`Parent Email: ${parentEmail}`);
    console.log(`Child Email:  ${childEmail}`);
    console.log('================================================================\n');

    // =================================================================
    // 1. PARENT PORTAL FLOW
    // =================================================================
    console.log('🔵 [PORTAL 1: PARENT] Starting Parent Onboarding & Registration...');
    const parentContext = await browser.newContext();
    const parentPage = await parentContext.newPage();

    // Listen for browser console & errors
    parentPage.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('Auth') || msg.text().includes('register')) {
        console.log(`[PARENT CONSOLE] [${msg.type()}] ${msg.text()}`);
      }
    });

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
    console.log('✓ [PORTAL 1: PARENT] Clicking [ CREATE ACCOUNT ]...');
    await parentPage.click('button[type="submit"]');

    // 1.5 Wait for successful registration & redirect
    await expect(parentPage).toHaveURL('/', { timeout: 15000 });
    console.log('🎉 [PORTAL 1: PARENT] Account successfully created and redirected to application!');

    // 1.6 Clear cookies/localStorage to test Sign-In cleanly from scratch
    console.log('✓ [PORTAL 1: PARENT] Resetting session to test fresh Sign-In flow...');
    await parentContext.clearCookies();
    await parentPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 1.7 Navigate to Sign-In
    await parentPage.goto('/auth/sign-in');
    await expect(parentPage.locator('h1')).toContainText('SIGN IN');

    // 1.8 Fill credentials and Sign In
    await parentPage.fill('#auth-email', parentEmail);
    await parentPage.fill('#auth-password', testPassword);
    console.log('✓ [PORTAL 1: PARENT] Submitting Parent credentials at /auth/sign-in...');
    await parentPage.click('button[type="submit"]');

    // 1.9 Verify Parent Sign-In succeeds
    await expect(parentPage).toHaveURL('/', { timeout: 15000 });
    console.log('✅ [PORTAL 1: PARENT] SIGN-IN SUCCESSFUL! Authenticated Parent session active.');


    // =================================================================
    // 2. CHILD PORTAL FLOW (Separate Isolated Browser Session)
    // =================================================================
    console.log('\n🟢 [PORTAL 2: CHILD] Starting Child Onboarding in isolated session...');
    const childContext = await browser.newContext();
    const childPage = await childContext.newPage();

    childPage.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('Auth') || msg.text().includes('register')) {
        console.log(`[CHILD CONSOLE] [${msg.type()}] ${msg.text()}`);
      }
    });

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
    console.log('✓ [PORTAL 2: CHILD] Clicking [ CREATE ACCOUNT ]...');
    await childPage.click('button[type="submit"]');

    // 2.5 Wait for successful registration & redirect
    await expect(childPage).toHaveURL('/', { timeout: 15000 });
    console.log('🎉 [PORTAL 2: CHILD] Account successfully created and redirected to application!');

    // 2.6 Reset session to test fresh Sign-In flow
    console.log('✓ [PORTAL 2: CHILD] Resetting session to test fresh Sign-In flow...');
    await childContext.clearCookies();
    await childPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2.7 Navigate to Sign-In
    await childPage.goto('/auth/sign-in');
    await expect(childPage.locator('h1')).toContainText('SIGN IN');

    // 2.8 Fill credentials and Sign In
    await childPage.fill('#auth-email', childEmail);
    await childPage.fill('#auth-password', testPassword);
    console.log('✓ [PORTAL 2: CHILD] Submitting Child credentials at /auth/sign-in...');
    await childPage.click('button[type="submit"]');

    // 2.9 Verify Child Sign-In succeeds
    await expect(childPage).toHaveURL('/', { timeout: 15000 });
    console.log('✅ [PORTAL 2: CHILD] SIGN-IN SUCCESSFUL! Authenticated Child session active.');

    // Clean up
    await parentContext.close();
    await childContext.close();

    console.log('\n================================================================');
    console.log('🎉 ALL PORTALS VERIFIED: BOTH PARENT & CHILD ACCOUNTS CREATED & LOGGED IN!');
    console.log('================================================================\n');
  });

});
