describe('Stats, Charts & Transactions Visualization Suite', () => {
  beforeEach(() => {
    // Intercept summary API call
    cy.intercept('GET', '**/api/summary*', {
      statusCode: 200,
      fixture: 'mockSummary.json',
    }).as('getSummary');

    cy.visit('/');
  });

  describe('Stats Cards', () => {
    it('displays all three metric cards with formatted currency', () => {
      cy.contains('Total Monthly Spending').should('be.visible');
      cy.contains("Today's Spending").should('be.visible');
      cy.contains('Weekly Spending').should('be.visible');

      // Verify LKR prefix and trend indicators are present
      cy.contains('Total Monthly Spending').closest('[class*="card"]').should('contain.text', 'LKR').and('contain.text', 'Trend');
      cy.contains("Today's Spending").closest('[class*="card"]').should('contain.text', 'LKR').and('contain.text', 'Trend');
      cy.contains('Weekly Spending').closest('[class*="card"]').should('contain.text', 'LKR').and('contain.text', 'Trend');
    });
  });

  describe('Spending Trend Chart', () => {
    it('renders the spending overview area chart and axis markers', () => {
      cy.contains('h2', 'Spending Overview').should('be.visible');
      cy.contains('Monthly Spending Trend').should('be.visible');
      cy.contains('↗ Trend').should('be.visible');

      // Check SVG canvas is rendered by Recharts
      cy.get('svg.recharts-surface').should('exist').and('be.visible');
    });
  });

  describe('Category Donut Chart', () => {
    it('renders category breakdown donut chart with center total and legend', () => {
      cy.contains('h2', 'Spending by Category').should('be.visible');

      // Check center total label
      cy.get('[class*="centerValue"]').should('be.visible').and('not.be.empty');
      cy.get('[class*="centerSub"]').should('contain.text', 'Total');

      // Check legend items
      const expectedCategories = ['Groceries', 'Food & Dining', 'Transport'];
      expectedCategories.forEach((cat) => {
        cy.contains('[class*="legendItem"]', cat).should('be.visible');
      });
    });
  });

  describe('Recent Transactions', () => {
    it('renders recent transactions list with merchant, category, and formatted amount', () => {
      cy.contains('h2', 'Recent Transactions').should('be.visible');
      cy.get('#btn-view-all-txn').should('be.visible');

      const expectedMerchants = ['Keells Super', 'Uber', 'PickMe Food', 'Netflix', 'Dialog'];
      expectedMerchants.forEach((m) => {
        cy.contains('[class*="merchant"]', m).should('be.visible');
      });

      // Check amounts formatting
      cy.contains('[class*="amount"]', '- LKR 2,500').should('be.visible');
    });
  });

  describe('AI Insight Card', () => {
    it('renders AI-generated insight banner and action button', () => {
      cy.contains('AI-generated Insight').should('be.visible');
      cy.contains('Your spending is').should('be.visible');
      cy.get('#btn-ai-explore').should('be.visible').and('contain.text', 'Explore Insights');
    });
  });
});
