const signals = [
  ['Cancellation & Refund', /\b(refund|cancel|cancellation|close my account)\b/i],
  ['Billing & Payments', /\b(payment|billing|bill|invoice|charge|credit card|subscription renewal)\b/i],
  ['Account & Access', /\b(locked out|log ?in|sign ?in|password|account recovery|(?:can't|cannot|unable to) access (?:my |the )?account)\b/i],
  ['Service Outage', /\b(outage|(?:server|service|site) (?:is )?down|all users|everyone affected)\b/i],
  ['Feature Request', /\b(feature request|dark mode|enhancement|could you add|can you add|would like to see)\b/i],
  ['Technical Support', /\b(bug|error|not working|loading|slow|timing out|connection lost)\b/i],
  ['Feedback & Praise', /\b(thank you|thanks|appreciate|great service|love your|happy with)\b/i]
]

const supportContext = /\b(relay|app|account|subscription|feature|plan|service|support|billing|payment|dashboard|product|customer|message|business hours|your hours)\b/i
const clarification = 'Which Relay AI product area is this about, and what outcome do you need?'

export function getRuleClassification(message) {
  const matched = signals.filter(([, pattern]) => pattern.test(message)).map(([category]) => category)
  let category = 'Other / Needs Clarification'
  let strong = true
  if (matched.length === 1) category = matched[0]
  else if (matched.length === 2) {
    const pair = new Set(matched)
    if (pair.has('Cancellation & Refund') && pair.has('Billing & Payments')) category = 'Cancellation & Refund'
    else if (pair.has('Service Outage') && pair.has('Technical Support')) category = 'Service Outage'
    else if (pair.has('Billing & Payments') && pair.has('Technical Support')) category = 'Billing & Payments'
    else if (pair.has('Account & Access') && pair.has('Technical Support')) category = 'Account & Access'
    else if (pair.has('Feature Request') && pair.has('Feedback & Praise')) category = 'Feature Request'
  }
  else if (matched.length === 0 && /\b(how|what|where|when|can i|do you)\b|\?/i.test(message) && supportContext.test(message)) {
    category = 'Product Question'
    strong = false
  }

  const needsClarification = category === 'Other / Needs Clarification'
  return {
    category,
    confidence: needsClarification ? 0.25 : strong ? 0.85 : 0.6,
    evidence: matched.length > 1 && needsClarification ? 'The message contains more than one support intent.' :
      matched.length > 0 ? `The message contains language associated with ${category}.` :
        category === 'Product Question' ? 'The customer asks about a service or product.' : 'No supported Relay AI intent was clear from the message.',
    reasoning: needsClarification ? 'More detail is needed before routing this message.' : `The stated intent fits ${category}.`,
    needsClarification,
    clarifyingQuestion: needsClarification ? clarification : '',
    strong,
    matchedCategories: matched,
    outOfDomain: matched.length === 0 && !supportContext.test(message)
  }
}
