describe('Dashboard Layout & Navigation Suite', () => {
  beforeEach(() => {
    // Intercept summary endpoint
    cy.intercept('GET', '**/api/summary*', {
      statusCode: 200,
      fixture: 'mockSummary.json',
    }).as('getSummary');

    cy.visit('/');
    cy.waitForHydration();
  });

  it('renders page title and root metadata correctly', () => {
    cy.title().should('contain', 'Centinel Fin AI');
  });

  it('renders sidebar with Centinel branding and navigation links', () => {
    cy.get('aside').should('be.visible');
    cy.contains('Centinel').should('be.visible');
    cy.contains('Fin AI').should('be.visible');

    const expectedNav = ['Dashboard', 'Transactions', 'Analytics', 'AI Assistant', 'Insights', 'Settings'];
    expectedNav.forEach((item) => {
      cy.contains('nav a', item).should('be.visible');
    });

    // Check user profile footer in sidebar
    cy.contains('Demo User').should('be.visible');
    cy.contains('demo-user-001').should('be.visible');
  });

  it('renders dashboard header and handles backend online health check', () => {
    cy.intercept('GET', '**/actuator/health', {
      statusCode: 200,
      body: { status: 'UP' },
    });

    cy.get('h1').should('contain.text', 'Dashboard');
    cy.contains("Welcome back — here's your financial overview.").should('be.visible');

    // Health check button
    cy.get('#btn-check-health').should('be.visible').click();
    cy.get('#btn-check-health').should('contain.text', 'Online');
  });

  it('handles backend offline status gracefully in health check', () => {
    cy.intercept('GET', '**/actuator/health', {
      statusCode: 503,
      body: { status: 'DOWN' },
    });

    cy.get('#btn-check-health').should('be.visible').click();
    cy.get('#btn-check-health').should('contain.text', 'Offline');
  });

  it('adapts layout gracefully on tablet/mobile viewports', () => {
    cy.viewport(768, 1024);
    cy.get('h1').should('contain.text', 'Dashboard');
    cy.get('aside').should('be.visible');

    cy.viewport(375, 667);
    cy.get('h1').should('contain.text', 'Dashboard');
  });
});
