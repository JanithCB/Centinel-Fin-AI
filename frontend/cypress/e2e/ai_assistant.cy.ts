describe('AI Assistant Interactive Chat Suite', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForHydration();
  });

  it('renders the floating AI Assistant panel and allows minimize/restore', () => {
    cy.get('[role="dialog"][aria-label="AI Assistant"]').should('be.visible');
    cy.contains('✦ AI Assistant').should('be.visible');
    cy.contains('Show me my largest expenses this month.').should('be.visible');

    // Minimize / close the panel
    cy.get('#btn-close-ai').click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('#btn-open-ai-assistant').should('be.visible');

    // Reopen panel
    cy.get('#btn-open-ai-assistant').click();
    cy.get('[role="dialog"][aria-label="AI Assistant"]').should('be.visible');
  });

  it('sends a user message on Enter and receives contextual AI reply for largest expenses', () => {
    cy.get('#ai-assistant-input').type('What is my largest expense?{enter}');

    // User message bubble appears
    cy.contains('[data-role="user"]', 'What is my largest expense?').should('be.visible');

    // Assistant response arrives after simulated processing delay
    cy.contains('[data-role="assistant"]', 'Groceries at LKR 18,500', { timeout: 6000 }).should('be.visible');
  });

  it('sends a user message via the send button and receives spending trend advice', () => {
    cy.get('#ai-assistant-input').type('Show my spending trend for the week');
    cy.get('#btn-send-ai').click();

    cy.contains('[data-role="user"]', 'Show my spending trend for the week').should('be.visible');
    cy.contains('[data-role="assistant"]', 'spending trend shows a 12% decrease', { timeout: 6000 }).should('be.visible');
  });

  it('handles general questions with default helpful guidance', () => {
    cy.get('#ai-assistant-input').type('Hello Centinel assistant{enter}');

    cy.contains('[data-role="user"]', 'Hello Centinel assistant').should('be.visible');
    cy.contains('[data-role="assistant"]', "I'm here to help with your financial insights!", { timeout: 6000 }).should('be.visible');
  });
});
