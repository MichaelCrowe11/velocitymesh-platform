import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { createTestWorkflow } from '../helpers/workflow';

/**
 * Comprehensive E2E tests for the Intelligent Workflow Builder
 * Tests cognitive load optimization, AI suggestions, and user experience
 */

test.describe('Intelligent Workflow Builder', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, 'test@velocitymesh.com', 'password123');
    await page.goto('/workflows/new');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display smart onboarding for new users', async () => {
    // Mock new user with no workflows
    await page.route('/api/workflows', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();
    
    // Should show smart onboarding
    await expect(page.locator('[data-testid="smart-onboarding"]')).toBeVisible();
    await expect(page.locator('text=Welcome to VelocityMesh')).toBeVisible();
    await expect(page.locator('text=Let\'s get you set up')).toBeVisible();

    // Test onboarding step progression
    await page.click('[data-testid="onboarding-next"]');
    await expect(page.locator('text=Create Your First Workflow')).toBeVisible();
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="progress-indicator"]')).toHaveAttribute('aria-valuenow', '25');
  });

  test('should provide AI-powered workflow suggestions', async () => {
    // Mock AI suggestion API
    await page.route('/api/ai/workflow-suggestion', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: [
            {
              id: 'email-automation',
              title: 'Email Automation',
              description: 'Automatically send emails based on triggers',
              confidence: 0.95,
              nodes: [
                { type: 'trigger', label: 'Email Received' },
                { type: 'condition', label: 'Check Sender' },
                { type: 'email', label: 'Send Reply' }
              ]
            }
          ]
        })
      });
    });

    // Click AI suggestion button
    await page.click('[data-testid="ai-suggestions-button"]');
    
    // Should show suggestions panel
    await expect(page.locator('[data-testid="ai-suggestions-panel"]')).toBeVisible();
    await expect(page.locator('text=Email Automation')).toBeVisible();
    
    // Should show confidence level
    await expect(page.locator('text=95%')).toBeVisible();
    
    // Apply suggestion
    await page.click('[data-testid="apply-suggestion-email-automation"]');
    
    // Should add nodes to canvas
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(3);
  });

  test('should show cognitive load indicator', async () => {
    // Create a complex workflow
    await createTestWorkflow(page, {
      nodes: [
        { type: 'trigger', position: { x: 100, y: 100 } },
        { type: 'condition', position: { x: 300, y: 100 } },
        { type: 'condition', position: { x: 500, y: 100 } },
        { type: 'email', position: { x: 700, y: 100 } },
        { type: 'slack', position: { x: 700, y: 300 } },
        { type: 'database', position: { x: 900, y: 200 } }
      ]
    });

    // Should show cognitive load indicator
    await expect(page.locator('[data-testid="cognitive-load-indicator"]')).toBeVisible();
    
    // Should show metrics
    await expect(page.locator('[data-testid="decision-points"]')).toContainText('2');
    await expect(page.locator('[data-testid="parallel-paths"]')).toContainText('2');
    
    // Should show optimization suggestions
    await expect(page.locator('[data-testid="optimization-suggestions"]')).toBeVisible();
    await expect(page.locator('text=Consider consolidating decision points')).toBeVisible();
  });

  test('should support progressive disclosure of advanced features', async () => {
    // Simulate intermediate user
    await page.evaluate(() => {
      localStorage.setItem('user-profile', JSON.stringify({
        experienceLevel: 'intermediate',
        preferences: { advancedFeatures: false }
      }));
    });

    await page.reload();

    // Advanced features should be hidden initially
    await expect(page.locator('[data-testid="advanced-node-types"]')).not.toBeVisible();
    
    // Show more options
    await page.click('[data-testid="show-advanced-features"]');
    
    // Advanced features should now be visible
    await expect(page.locator('[data-testid="advanced-node-types"]')).toBeVisible();
    await expect(page.locator('[data-testid="webhook-node"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-code-node"]')).toBeVisible();
  });

  test('should provide contextual smart defaults', async () => {
    // Add an HTTP node
    await page.dragAndDrop('[data-testid="http-node-template"]', '[data-testid="workflow-canvas"]');
    
    // Click on the node to configure
    await page.click('[data-testid="workflow-node-http"]');
    
    // Should show smart defaults panel
    await expect(page.locator('[data-testid="smart-defaults-panel"]')).toBeVisible();
    await expect(page.locator('text=Smart Defaults')).toBeVisible();
    
    // Should suggest timeout based on user experience
    await expect(page.locator('[data-testid="timeout-default"]')).toContainText('15000');
    await expect(page.locator('[data-testid="retry-count-default"]')).toContainText('3');
    
    // Apply defaults
    await page.click('[data-testid="apply-all-defaults"]');
    
    // Fields should be populated
    await expect(page.locator('[name="timeout"]')).toHaveValue('15000');
    await expect(page.locator('[name="retryCount"]')).toHaveValue('3');
  });

  test('should adapt interface based on user behavior', async () => {
    // Simulate user clicking many advanced features
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="advanced-settings-toggle"]');
      await page.waitForTimeout(100);
    }

    // Interface should adapt to show more advanced features by default
    await page.reload();
    
    // Should automatically show advanced features
    await expect(page.locator('[data-testid="advanced-node-types"]')).toBeVisible();
    
    // Should show compact layout for power users
    await expect(page.locator('[data-testid="workflow-canvas"]')).toHaveClass(/compact-layout/);
  });

  test('should handle error states gracefully', async () => {
    // Mock API error
    await page.route('/api/workflows', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Try to save workflow
    await page.click('[data-testid="save-workflow-button"]');
    
    // Should show error message with helpful recovery options
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Something went wrong')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-draft-button"]')).toBeVisible();
  });

  test('should provide real-time collaboration feedback', async () => {
    // Mock collaboration events
    await page.evaluate(() => {
      // Simulate WebSocket connection
      const mockSocket = {
        send: () => {},
        close: () => {},
        addEventListener: () => {}
      };
      
      window.mockWebSocket = mockSocket;
    });

    // Should show collaboration indicators
    await expect(page.locator('[data-testid="collaboration-status"]')).toBeVisible();
    
    // Simulate another user joining
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('collaboration-user-joined', {
        detail: { user: { name: 'John Doe', avatar: '/avatars/john.png' } }
      }));
    });

    // Should show user presence
    await expect(page.locator('[data-testid="user-presence"]')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should track user interactions for optimization', async () => {
    const behaviorEvents: any[] = [];
    
    // Intercept behavior tracking
    await page.route('/api/analytics/behavior', async route => {
      const request = route.request();
      const data = JSON.parse(request.postData() || '{}');
      behaviorEvents.push(data);
      await route.fulfill({ status: 200, body: 'OK' });
    });

    // Perform various interactions
    await page.click('[data-testid="add-node-button"]');
    await page.click('[data-testid="trigger-node-template"]');
    await page.click('[data-testid="workflow-canvas"]');

    // Should track interactions
    expect(behaviorEvents.length).toBeGreaterThan(0);
    expect(behaviorEvents.some(e => e.type === 'click')).toBe(true);
    expect(behaviorEvents.some(e => e.element === 'add-node-button')).toBe(true);
  });

  test('should provide accessibility support', async () => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="add-node-button"]')).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible();
    
    // Test screen reader announcements
    await page.click('[data-testid="trigger-node-template"]');
    const announcement = await page.locator('[aria-live="polite"]').textContent();
    expect(announcement).toContain('Trigger node added to workflow');
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('[data-testid="workflow-canvas"]')).toHaveClass(/dark-theme/);
  });
});