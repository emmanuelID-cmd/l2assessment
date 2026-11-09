import test from 'node:test'
import assert from 'node:assert/strict'
import { refineTicketWithFollowUp } from './ticketRefinement.js'
import { closeTicket } from './ticketCloseout.js'
import { parseHistory } from './historyStore.js'

const draft = {
  message: 'I need help with the app',
  category: 'Product Question',
  initialCategory: 'Product Question',
  initialRecommendedAction: 'Provide product guidance.',
  initialCustomerResponse: 'Which feature do you mean?',
  recommendedAction: 'Provide product guidance.',
  customerResponse: 'Which feature do you mean?',
  confidence: 0.6,
  evidence: 'The customer asks about a product.',
  reasoning: 'The request appears to be a product question.',
  urgency: 'Low',
  timestamp: '2026-09-29T12:00:00.000Z'
}

test('clarifying account issue changes only the provisional category', () => {
  const refined = refineTicketWithFollowUp(draft, 'I am actually locked out of my account')
  assert.equal(refined.category, 'Account & Access')
  assert.equal(refined.initialCategory, 'Product Question')
  assert.equal(refined.categoryCorrections, undefined)
  assert.match(refined.recommendedAction, /account access/)
})

test('ordinary follow-up does not turn a strong support case into a new category', () => {
  const account = { ...draft, category: 'Account & Access', confidence: 0.85 }
  assert.equal(refineTicketWithFollowUp(account, 'Thank you for the help').category, 'Account & Access')
})

test('an explicit clarification can correct a strong initial category', () => {
  const initial = { ...draft, category: 'Billing & Payments', initialCategory: 'Billing & Payments', confidence: 0.85 }
  assert.equal(refineTicketWithFollowUp(initial, 'Actually, I cannot log in to my account').category, 'Account & Access')
})

test('closeout records one final correction and its reason for History', async () => {
  const refined = refineTicketWithFollowUp(draft, 'I am actually locked out of my account')
  const turns = [
    { role: 'user', content: 'I am actually locked out of my account' },
    { role: 'assistant', content: 'Where does the sign-in fail?' },
    { role: 'user', content: 'The reset link says it expired.' },
    { role: 'assistant', content: 'Please request a fresh reset link.' }
  ]
  const closed = await closeTicket(refined, turns)
  assert.equal(closed.category, 'Account & Access')
  assert.equal(closed.categoryCorrections.length, 1)
  assert.equal(closed.categoryCorrections[0].previousCategory, 'Product Question')
  assert.match(closed.categoryCorrections[0].reason, /follow-up clarified/)
  assert.equal(closed.timestamp, closed.closedAt)
  assert.equal(closed.issueType, 'Password and recovery')
  const savedView = parseHistory(JSON.stringify([closed])).records[0]
  assert.equal(savedView.needsCategoryReview, false)
  assert.equal(savedView.categoryCorrections[0].reason, closed.categoryCorrections[0].reason)
  assert.equal(savedView.issueType, 'Password and recovery')
  assert.equal(savedView.initialCustomerResponse, 'Which feature do you mean?')
  assert.deepEqual(savedView.followUpTurns, turns)
})
