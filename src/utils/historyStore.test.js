import test from 'node:test'
import assert from 'node:assert/strict'
import { appendHistory, parseHistory, readHistory } from './historyStore.js'

const base = {
  message: 'Can you add dark mode?',
  category: 'Feature Request',
  urgency: 'Low',
  timestamp: '2026-09-29T12:00:00.000Z',
  recommendedAction: 'Collect the use case.',
  reasoning: 'The customer requested a feature.'
}

test('empty and current history are readable', () => {
  assert.deepEqual(parseHistory(null).records, [])
  const current = { ...base, confidence: 0.8, evidence: 'The customer asks for dark mode.', needsClarification: false, clarifyingQuestion: '', customerResponse: 'Thanks for the suggestion.' }
  const result = parseHistory(JSON.stringify([current]))
  assert.equal(result.records[0].category, 'Feature Request')
  assert.equal(result.records[0].confidence, 0.8)
  assert.equal(result.records[0].needsClarification, false)
  assert.deepEqual(result.issues, [])
})

test('closeout timestamps distinguish closed tickets from older analyses', () => {
  const closedAt = '2026-09-29T13:00:00.000Z'
  const result = parseHistory(JSON.stringify([base, { ...base, closedAt }]))
  assert.equal(result.records[0].closedAt, undefined)
  assert.equal(result.records[1].closedAt, closedAt)
  assert.deepEqual(result.issues, [])
})

test('malformed JSON and non-list history are reported without rewriting raw data', () => {
  for (const raw of ['{broken', '{}']) {
    const result = parseHistory(raw)
    assert.equal(result.raw, raw)
    assert.deepEqual(result.records, [])
    assert.equal(result.issues.length, 1)
  }
})

test('invalid required fields do not hide valid records', () => {
  const result = parseHistory(JSON.stringify([{ ...base, message: null }, { ...base, urgency: 'Critical' }, base]))
  assert.equal(result.records.length, 1)
  assert.equal(result.issues.length, 2)
})

test('known legacy categories are mapped only for display', () => {
  const raw = JSON.stringify([
    { ...base, message: 'My payment method was charged twice', category: 'Billing Issue' },
    { ...base, message: 'The dashboard is not working', category: 'Technical Problem' }
  ])
  const result = parseHistory(raw)
  assert.deepEqual(result.records.map(row => row.category), ['Billing & Payments', 'Technical Support'])
  assert.deepEqual(JSON.parse(result.raw).map(row => row.category), ['Billing Issue', 'Technical Problem'])
})

test('ambiguous and unknown labels keep their saved category and need staff review', () => {
  const result = parseHistory(JSON.stringify([{ ...base, category: 'General Inquiry' }, { ...base, category: 'Billing issue' }]))
  assert.deepEqual(result.records.map(row => row.category), ['Legacy: General Inquiry', 'Legacy: Billing issue'])
  assert.deepEqual(result.records.map(row => row.needsCategoryReview), [true, true])
  assert.deepEqual(result.records.map(row => row.savedCategory), ['General Inquiry', 'Billing issue'])
})

test('suspect stored labels are flagged without changing the original', () => {
  const raw = JSON.stringify([{ ...base, message: 'I am locked out of my account', category: 'Product Question' }])
  const result = parseHistory(raw)
  assert.equal(result.records[0].category, 'Product Question')
  assert.equal(result.records[0].needsCategoryReview, true)
  assert.equal(result.records[0].suggestedCategory, 'Account & Access')
  assert.equal(JSON.parse(result.raw)[0].category, 'Product Question')
  const unrelated = parseHistory(JSON.stringify([{ ...base, message: 'How do I delete old Gmail emails?', category: 'Product Question' }]))
  assert.equal(unrelated.records[0].category, 'Product Question')
  assert.equal(unrelated.records[0].needsCategoryReview, true)
  assert.equal(unrelated.records[0].suggestedCategory, '')
})

test('previously corrected tickets retain a read-only correction record', () => {
  const corrected = {
    ...base,
    message: 'I am locked out of my account',
    category: 'Account & Access',
    evidence: 'Manual review of the original customer message.',
    categoryCorrections: [{ previousCategory: 'Product Question', previousRecommendedAction: 'Read the FAQ.', previousCustomerResponse: 'Try the FAQ.', correctedAt: '2026-09-29T13:00:00.000Z' }]
  }
  const result = parseHistory(JSON.stringify([corrected]))
  assert.equal(result.records[0].category, 'Account & Access')
  assert.equal(result.records[0].needsCategoryReview, false)
  assert.equal(result.records[0].categoryCorrections[0].previousCategory, 'Product Question')
  assert.equal(result.records[0].evidence, corrected.evidence)
})

test('optional fields with wrong types are reported and omitted from display', () => {
  const result = parseHistory(JSON.stringify([{ ...base, confidence: '0.6', evidence: { text: 'x' }, needsClarification: 'false' }]))
  assert.equal(result.records.length, 1)
  assert.equal(result.issues.length, 3)
  assert.equal(result.records[0].confidence, undefined)
})

test('invalid follow-up history is reported without losing the original ticket', () => {
  const raw = JSON.stringify([{ ...base, followUpTurns: [{ role: 'system', content: 'not a customer turn' }] }])
  const result = parseHistory(raw)
  assert.equal(result.records.length, 1)
  assert.equal(result.records[0].followUpTurns, undefined)
  assert.match(result.issues[0], /invalid follow-up turns/)
  assert.equal(result.raw, raw)
})

test('append preserves legacy entries and refuses to overwrite malformed history', () => {
  const legacy = { ...base, category: 'General Inquiry' }
  let raw = JSON.stringify([legacy])
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value } }
  appendHistory(base, storage)
  assert.deepEqual(JSON.parse(raw), [legacy, base])
  raw = '{broken'
  assert.throws(() => appendHistory(base, storage), /Export it before/)
  assert.equal(raw, '{broken')
  raw = '{}'
  assert.throws(() => appendHistory(base, storage), /not a list/)
  assert.equal(raw, '{}')
})

test('unavailable browser storage reports an actionable issue', () => {
  const result = readHistory({ getItem: () => { throw new Error('denied') } })
  assert.equal(result.records.length, 0)
  assert.equal(result.issues.length, 1)
  assert.equal(result.raw, null)
})
