import { getRuleClassification } from './categoryRules.js'
import { getRecommendedAction } from './templates.js'

const explicitCorrection = /\b(actually|i meant|to clarify|the issue is|my problem is|specifically)\b/i

export function refineTicketWithFollowUp(ticket, question) {
  const rule = getRuleClassification(question)
  const canRefine = ticket.needsClarification || ticket.confidence < 0.8 || explicitCorrection.test(question)
  const changed = canRefine && rule.strong && !rule.needsClarification && rule.category !== ticket.category

  if (!changed) return ticket

  return {
    ...ticket,
    category: rule.category,
    confidence: rule.confidence,
    evidence: `Follow-up clarification: ${question}`,
    reasoning: `The follow-up clarified that the request belongs to ${rule.category}.`,
    needsClarification: false,
    clarifyingQuestion: '',
    recommendedAction: getRecommendedAction(rule.category),
    categoryReason: `The customer's follow-up clarified the ${rule.category} issue.`
  }
}
