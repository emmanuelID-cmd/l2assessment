import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CATEGORY_DEFINITIONS, CATEGORY_NAMES } from './categories.js'
import { getRuleClassification } from './categoryRules.js'
import { getAvailableCategories, getRecommendedAction } from './templates.js'

const fixtures = JSON.parse(readFileSync(new URL('../../sample-messages.json', import.meta.url), 'utf8')).testMessages

test('synthetic examples route to the expected categories', () => {
  for (const fixture of fixtures) {
    assert.equal(getRuleClassification(fixture.message).category, fixture.expectedCategory, `Case ${fixture.id}`)
  }
})

test('canonical categories and recommended actions stay aligned', () => {
  assert.deepEqual(getAvailableCategories(), CATEGORY_NAMES)
  assert.deepEqual(Object.keys(CATEGORY_DEFINITIONS), CATEGORY_NAMES)
  for (const category of CATEGORY_NAMES) assert.notEqual(getRecommendedAction(category), 'No recommendation available.')
})

test('mixed symptoms use the supported primary category without false reasoning', () => {
  const result = getRuleClassification('I tried to update my payment method but the page keeps loading forever')
  assert.equal(result.category, 'Billing & Payments')
  assert.match(result.evidence, /Billing & Payments/)
  assert.equal(result.needsClarification, false)
})
