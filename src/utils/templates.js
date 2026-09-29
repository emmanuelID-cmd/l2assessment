/**
 * Recommendation Templates - Maps categories to recommended actions
 */

const actionTemplates = {
  "Billing & Payments": "Confirm the billing concern without requesting sensitive payment details.",
  "Account & Access": "Ask where account access fails and request the exact non-sensitive error message.",
  "Technical Support": "Collect the reproduction steps, error message, browser, and device details.",
  "Service Outage": "Confirm the service impact and escalate the outage details for investigation.",
  "Feature Request": "Share the suggestion with the product team and collect the customer's use case.",
  "Product Question": "Provide the relevant product guidance or ask which feature they are trying to use.",
  "Feedback & Praise": "Acknowledge the feedback and share it with the appropriate team.",
  "Cancellation & Refund": "Confirm whether the customer needs cancellation or refund support without requesting sensitive details.",
  "Other / Needs Clarification": "Ask for the product area, expected outcome, and observed problem."
}

/**
 * Get recommended action for a given category
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category) {
  return actionTemplates[category] || "No recommendation available."
}

/**
 * Get all available categories
 * 
 * @returns {string[]} - List of categories
 */
export function getAvailableCategories() {
  return Object.keys(actionTemplates)
}

/**
 * Determines if message should be escalated
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @param {string} message - The original message
 * @returns {boolean} - Whether to escalate
 */
export function shouldEscalate(category, urgency, message) {
  return message.length > 100
}
