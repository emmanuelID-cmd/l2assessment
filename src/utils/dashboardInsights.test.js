import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUrgencyInsights } from './dashboardInsights.js'

test('insights separate urgency, category, issue type, and review counts', () => {
  const records = [
    { urgency: 'Low', category: 'Billing & Payments', message: 'My payment failed' },
    { urgency: 'Low', category: 'Billing & Payments', message: 'The card declined and payment failed' },
    { urgency: 'Low', category: 'Account & Access', message: 'I am locked out of my account' },
    { urgency: 'Medium', category: 'Billing & Payments', message: 'I was charged twice' },
    { urgency: 'High', category: 'Account & Access', message: 'I am locked out', needsCategoryReview: true }
  ]

  const [high, medium, low] = buildUrgencyInsights(records)
  assert.deepEqual([high.total, medium.total, low.total], [1, 1, 3])
  assert.equal(high.pendingReview, 1)
  assert.deepEqual(high.categories, [])
  assert.equal(medium.categories[0].topics[0].name, 'Duplicate charges')
  assert.equal(low.categories[0].name, 'Billing & Payments')
  assert.equal(low.categories[0].count, 2)
  assert.deepEqual(low.categories[0].topics, [{ name: 'Failed payments', count: 2 }])
  assert.equal(low.categories[0].summary, 'These tickets mainly concern failed payments.')
  assert.equal(low.categories[1].topics[0].name, 'Account lockouts')
})

test('a stored closeout issue label takes precedence over older keyword grouping', () => {
  const band = buildUrgencyInsights([{ urgency: 'Medium', category: 'Technical Support', message: 'The app has an error', issueType: 'Payroll dashboard export error' }])[1]
  assert.deepEqual(band.categories[0].topics, [{ name: 'Payroll dashboard export error', count: 1 }])
  assert.equal(band.categories[0].summary, 'These tickets mainly concern payroll dashboard export error.')
})

test('multiple issue types become one brief summary instead of a count list', () => {
  const records = [
    { urgency: 'Low', category: 'Billing & Payments', message: 'Payment failed' },
    { urgency: 'Low', category: 'Billing & Payments', message: 'Another payment failed' },
    { urgency: 'Low', category: 'Billing & Payments', message: 'The payment failed again' },
    { urgency: 'Low', category: 'Billing & Payments', message: 'I was charged twice' }
  ]
  const summary = buildUrgencyInsights(records)[2].categories[0].summary
  assert.equal(summary, 'Most tickets concern failed payments; others include duplicate charges.')
})
