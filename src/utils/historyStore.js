import { CATEGORY_NAMES } from './categories.js'
import { getRuleClassification } from './categoryRules.js'

export const HISTORY_KEY = 'triageHistory'

const currentCategories = new Set(CATEGORY_NAMES)
const legacyCategories = new Map([
  ['Billing Issue', 'Billing & Payments'],
  ['Technical Problem', 'Technical Support']
])
const urgencyLevels = new Set(['High', 'Medium', 'Low'])

export function parseHistory(raw) {
  if (raw === null) return { records: [], issues: [], raw }

  let entries
  try {
    entries = JSON.parse(raw)
  } catch {
    return { records: [], issues: ['Saved history is not valid JSON. Export it before making changes.'], raw }
  }

  if (!Array.isArray(entries)) {
    return { records: [], issues: ['Saved history is not a list. Export it before making changes.'], raw }
  }

  const issues = []
  const records = []
  entries.forEach((entry, index) => {
    const label = `Record ${index + 1}`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        typeof entry.message !== 'string' || !entry.message.trim() ||
        typeof entry.category !== 'string' || !entry.category.trim() ||
        !urgencyLevels.has(entry.urgency) ||
        typeof entry.timestamp !== 'string' || Number.isNaN(Date.parse(entry.timestamp))) {
      issues.push(`${label} has missing or invalid required fields and was left in storage.`)
      return
    }

    const category = legacyCategories.get(entry.category) ||
      (currentCategories.has(entry.category) ? entry.category : `Legacy: ${entry.category}`)
    if (category !== entry.category) {
      issues.push(`${label} uses a legacy category; its original value was preserved.`)
    }

    const rule = getRuleClassification(entry.message)
    const reviewed = Array.isArray(entry.categoryCorrections) && entry.categoryCorrections.length > 0
    const needsReview = !reviewed && (
      category.startsWith('Legacy: ') ||
      (rule.matchedCategories.length > 1 && rule.category === 'Other / Needs Clarification') ||
      (rule.outOfDomain && category !== 'Other / Needs Clarification') ||
      (rule.confidence >= 0.8 && rule.category !== category)
    )
    if (needsReview) issues.push(`${label} may have an inaccurate category and needs review.`)

    const record = {
      message: entry.message,
      category,
      savedCategory: entry.category,
      suggestedCategory: rule.confidence >= 0.8 ? rule.category : '',
      needsCategoryReview: needsReview,
      storageIndex: index,
      urgency: entry.urgency,
      timestamp: entry.timestamp
    }
    if (entry.closedAt !== undefined) {
      if (typeof entry.closedAt === 'string' && !Number.isNaN(Date.parse(entry.closedAt))) record.closedAt = entry.closedAt
      else issues.push(`${label} has an invalid closeout timestamp; it remains in History but is excluded from closed-case analytics.`)
    }
    if (category !== entry.category) record.originalCategory = entry.category
    if (reviewed) record.categoryCorrections = entry.categoryCorrections.filter(correction =>
      correction && typeof correction === 'object' && typeof correction.previousCategory === 'string'
    ).map(correction => ({
      previousCategory: correction.previousCategory,
      previousRecommendedAction: typeof correction.previousRecommendedAction === 'string' ? correction.previousRecommendedAction : '',
      previousCustomerResponse: typeof correction.previousCustomerResponse === 'string' ? correction.previousCustomerResponse : '',
      reason: typeof correction.reason === 'string' ? correction.reason : '',
      correctedAt: typeof correction.correctedAt === 'string' ? correction.correctedAt : ''
    }))

    if (entry.followUpTurns !== undefined) {
      if (Array.isArray(entry.followUpTurns) && entry.followUpTurns.every(turn =>
        turn && typeof turn === 'object' && !Array.isArray(turn) &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' && turn.content.trim()
      )) {
        record.followUpTurns = entry.followUpTurns.map(turn => ({ role: turn.role, content: turn.content }))
      } else {
        issues.push(`${label} has invalid follow-up turns; the original data was left in storage.`)
      }
    }

    for (const field of ['recommendedAction', 'reasoning', 'evidence', 'customerResponse', 'initialCustomerResponse', 'clarifyingQuestion', 'issueType']) {
      if (entry[field] === undefined) continue
      if (typeof entry[field] === 'string') record[field] = entry[field]
      else issues.push(`${label} has an invalid ${field} value; it was left in storage.`)
    }
    if (entry.confidence !== undefined) {
      if (typeof entry.confidence === 'number' && Number.isFinite(entry.confidence) && entry.confidence >= 0 && entry.confidence <= 1) {
        record.confidence = entry.confidence
      } else issues.push(`${label} has an invalid confidence value; it was left in storage.`)
    }
    if (entry.needsClarification !== undefined) {
      if (typeof entry.needsClarification === 'boolean') record.needsClarification = entry.needsClarification
      else issues.push(`${label} has an invalid needsClarification value; it was left in storage.`)
    }
    records.push(record)
  })

  return { records, issues, raw }
}

export function readHistory(storage) {
  try {
    return parseHistory((storage || localStorage).getItem(HISTORY_KEY))
  } catch {
    return { records: [], issues: ['Browser storage is unavailable. Saved history cannot be read or exported here.'], raw: null }
  }
}

export function appendHistory(record, storage) {
  const target = storage || localStorage
  const raw = target.getItem(HISTORY_KEY)
  let entries = []
  if (raw !== null) {
    try {
      entries = JSON.parse(raw)
    } catch {
      throw new Error('Saved history is not valid JSON. Export it before adding new analyses.')
    }
    if (!Array.isArray(entries)) {
      throw new Error('Saved history is not a list. Export it before adding new analyses.')
    }
  }
  target.setItem(HISTORY_KEY, JSON.stringify([...entries, record]))
}
