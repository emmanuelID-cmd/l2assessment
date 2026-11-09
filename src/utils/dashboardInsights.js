const urgencyOrder = ['High', 'Medium', 'Low']

const issuePatterns = {
  'Billing & Payments': [
    ['Duplicate charges', /\b(charged twice|duplicate charge|double charg)/i],
    ['Failed payments', /\b(payment failed|card declined|payment declined|failed payment)/i],
    ['Invoices and receipts', /\b(invoice|receipt)/i],
    ['Payment methods', /\b(payment method|credit card|debit card)/i],
    ['Subscription billing', /\b(subscription|renewal)/i]
  ],
  'Account & Access': [
    ['Account lockouts', /\b(locked out|account locked)/i],
    ['Password and recovery', /\b(password|recovery code|reset link)/i],
    ['Sign-in problems', /\b(log ?in|sign ?in|access my account)/i],
    ['Permissions', /\b(permission|role|access denied)/i]
  ],
  'Technical Support': [
    ['Loading problems', /\b(load|spinner|blank page)/i],
    ['Errors and bugs', /\b(error|bug|crash)/i],
    ['Slow performance', /\b(slow|lag|timing out)/i],
    ['Connection problems', /\b(connection|offline|disconnect)/i]
  ],
  'Service Outage': [
    ['Service unavailable', /\b(down|outage|unavailable)/i],
    ['Widespread impact', /\b(all users|everyone|whole team)/i]
  ],
  'Feature Request': [
    ['Dark mode', /\bdark mode\b/i],
    ['Export features', /\b(export|download|csv)/i],
    ['Integrations', /\b(integrat|connect to)/i]
  ],
  'Product Question': [
    ['How-to guidance', /\b(how do i|how can i|where do i)/i],
    ['Availability and hours', /\b(hours|available|availability)/i]
  ],
  'Feedback & Praise': [
    ['Positive feedback', /\b(thank|love|great|happy)/i],
    ['Criticism', /\b(disappoint|frustrat|poor)/i]
  ],
  'Cancellation & Refund': [
    ['Refunds', /\b(refund|money back)/i],
    ['Cancellations', /\b(cancel|close my account)/i]
  ]
}

export function getIssueType(category, message) {
  const match = (issuePatterns[category] || []).find(([, pattern]) => pattern.test(message))
  return match ? match[0] : 'Other details'
}

function asPhrase(label) {
  return label.replace(/^[A-Z][a-z]/, start => start.toLowerCase())
}

export function summarizeIssues(topics, total) {
  const specific = topics.filter(topic => topic.name !== 'Other details')
  if (specific.length === 0) return 'The saved details do not yet show a clear common issue.'

  const [first, second] = specific
  const main = asPhrase(first.name)
  if (!second) {
    return first.count === total
      ? `These tickets mainly concern ${main}.`
      : `Several tickets concern ${main}; the remaining issues need closer review.`
  }

  const next = asPhrase(second.name)
  if (first.count > total / 2) return `Most tickets concern ${main}; others include ${next}.`
  return specific.length > 2 || first.count + second.count < total
    ? `Common issues include ${main} and ${next}, alongside other concerns.`
    : `These tickets concern ${main} and ${next}.`
}

export function buildUrgencyInsights(records) {
  return urgencyOrder.map(urgency => {
    const band = records.filter(record => record.urgency === urgency)
    const pendingReview = band.filter(record => record.needsCategoryReview).length
    const categoryMap = new Map()

    band.filter(record => !record.needsCategoryReview).forEach(record => {
      if (!categoryMap.has(record.category)) categoryMap.set(record.category, { name: record.category, count: 0, topics: new Map() })
      const category = categoryMap.get(record.category)
      const topic = typeof record.issueType === 'string' && record.issueType.trim() ? record.issueType.trim() : getIssueType(record.category, record.message)
      category.count += 1
      category.topics.set(topic, (category.topics.get(topic) || 0) + 1)
    })

    return {
      urgency,
      total: band.length,
      pendingReview,
      categories: [...categoryMap.values()]
        .map(category => {
          const topics = [...category.topics].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          return { name: category.name, count: category.count, summary: summarizeIssues(topics, category.count), topics }
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    }
  })
}
