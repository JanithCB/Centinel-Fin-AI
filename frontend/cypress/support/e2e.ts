// Cypress support file
export {};

Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop') || err.message.includes('Hydration')) {
    return false;
  }
  return true;
});

declare global {
  namespace Cypress {
    interface Chainable {
      waitForHydration(): Chainable<Element>;
    }
  }
}

Cypress.Commands.add('waitForHydration', () => {
  return cy.get('[data-hydrated="true"]', { timeout: 10000 }).should('exist');
});
