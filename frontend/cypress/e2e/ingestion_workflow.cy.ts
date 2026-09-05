describe('Transaction Ingestion & Dev Tooling Workflow Suite', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForHydration();
    // Minimize floating AI panel so dev controls at page bottom are unobstructed
    cy.get('#btn-close-ai').click();
  });

  it('renders the Mock Ingestion Trigger panel with default JSON payload', () => {
    cy.contains('span', 'DEV').should('be.visible');
    cy.contains('h2', 'Mock Ingestion Trigger').should('be.visible');

    cy.get('#ingestion-payload')
      .should('be.visible')
      .and('contain.value', 'mock_n8n')
      .and('contain.value', 'Keells Super')
      .and('contain.value', 'demo-user-001');

    cy.get('#btn-trigger-ingestion').should('be.visible').and('contain.text', 'Send Mock Transaction');
  });

  it('dispatches ingestion payload with correct headers and receives ACCEPTED response', () => {
    cy.intercept('POST', '**/api/v1/ingestion/transaction-messages', {
      statusCode: 200,
      body: {
        id: 'evt-7f89a1b2-c3d4-4e5f-a6b7-c8d9e0f1a2b3',
        externalMessageId: 'mock-msg-001',
        status: 'ACCEPTED',
        receivedAt: '2026-09-05T20:30:00+05:30',
        message: 'Transaction message ingested successfully and queued for processing.',
      },
    }).as('ingestMessage');

    cy.get('#btn-trigger-ingestion').scrollIntoView().click({ force: true });
    cy.wait('@ingestMessage').then((interception) => {
      const reqBody = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;
      expect(reqBody).to.have.property('source', 'mock_n8n');
      expect(reqBody).to.have.property('userReference', 'demo-user-001');
    });

    // Status badge check
    cy.contains('[class*="statusBadge"]', 'ACCEPTED').should('be.visible');

    // Response panel check
    cy.get('[class*="responseBox"]').should('be.visible');
    cy.get('[class*="responsePre"]').should('contain.text', 'ACCEPTED')
      .and('contain.text', 'evt-7f89a1b2');
  });

  it('handles duplicate transaction responses correctly', () => {
    cy.intercept('POST', '**/api/v1/ingestion/transaction-messages', {
      statusCode: 200,
      body: {
        id: 'evt-dup-999',
        externalMessageId: 'mock-msg-001',
        status: 'DUPLICATE',
        message: 'Duplicate event detected: already processed.',
      },
    }).as('duplicateIngest');

    cy.get('#btn-trigger-ingestion').scrollIntoView().click({ force: true });
    cy.wait('@duplicateIngest');

    cy.contains('[class*="statusBadge"]', 'DUPLICATE').should('be.visible');
  });

  it('displays error badge and helpful troubleshooting message on backend failure or 401', () => {
    cy.intercept('POST', '**/api/v1/ingestion/transaction-messages', {
      statusCode: 401,
      body: { error: 'Unauthorized: Invalid ingestion API key' },
    }).as('unauthorizedIngest');

    cy.get('#btn-trigger-ingestion').scrollIntoView().click({ force: true });
    cy.wait('@unauthorizedIngest');

    cy.contains('[class*="statusBadge"]', 'ERROR').should('be.visible');
    cy.get('[class*="errorHint"]').should('contain.text', 'Spring Boot backend is running on port 8080');
  });

  it('allows customizing messageText payload with sensitive bank account data', () => {
    cy.intercept('POST', '**/api/v1/ingestion/transaction-messages', {
      statusCode: 200,
      body: {
        id: 'evt-acc-555',
        externalMessageId: 'custom-bank-001',
        status: 'ACCEPTED',
        message: 'Processed and masked',
      },
    }).as('customIngest');

    // Update payload text
    const customPayload = {
      source: 'mock_n8n',
      externalMessageId: 'custom-bank-001',
      userReference: 'demo-user-001',
      messageText: 'Account 001234567890 debited by LKR 5,000 at Dialog',
      receivedAt: '2026-09-05T21:00:00+05:30',
    };

    cy.get('#ingestion-payload').scrollIntoView().clear().type(JSON.stringify(customPayload, null, 2), { parseSpecialCharSequences: false });
    cy.get('#btn-trigger-ingestion').scrollIntoView().click({ force: true });
    cy.wait('@customIngest');

    cy.contains('[class*="statusBadge"]', 'ACCEPTED').should('be.visible');
  });
});
