import Groq from 'groq-sdk'

export const CATEGORY_DEFINITIONS = {
  'Billing & Payments': 'Charges, invoices, payment failures, payment methods, or subscription billing.',
  'Account & Access': 'Login, account access, permissions, password, or account settings problems.',
  'Technical Support': 'A product bug, error, broken feature, loading problem, or unexpected behavior.',
  'Service Outage': 'A broad outage, downtime, unavailable service, or issue affecting many users.',
  'Feature Request': 'A request for new functionality, an enhancement, or a product improvement.',
  'Product Question': 'A question about how an existing product feature or service works.',
  'Feedback & Praise': 'Positive feedback, criticism, or comments that do not ask for a new feature or support fix.',
  'Cancellation & Refund': 'A request to cancel a service, close an account, or receive a refund.',
  'Other / Needs Clarification': 'The message is unclear, incomplete, or outside the supported support domains.'
}

const categories = Object.keys(CATEGORY_DEFINITIONS)
const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

function parseClassification(content) {
  const parsed = JSON.parse(content)
  const category = categories.includes(parsed.category) ? parsed.category : 'Other / Needs Clarification'
  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
    evidence: typeof parsed.evidence === 'string' ? parsed.evidence : 'The message needs more detail to identify the relevant support domain.',
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'The message was classified using its stated intent and available details.',
    needsClarification: Boolean(parsed.needsClarification) || category === 'Other / Needs Clarification',
    clarifyingQuestion: typeof parsed.clarifyingQuestion === 'string' ? parsed.clarifyingQuestion : ''
  }
}

export async function categorizeMessage(message) {
  if (!import.meta.env.VITE_GROQ_API_KEY) return getFallbackCategorization(message)

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You classify customer support messages. Return only valid JSON with these fields: category, confidence, evidence, reasoning, needsClarification, clarifyingQuestion. Choose exactly one category from this list and do not invent categories: ${JSON.stringify(CATEGORY_DEFINITIONS)}. Confidence must be a number from 0 to 1. Evidence must quote or paraphrase the relevant user intent. If the message is unclear or outside these support domains, use Other / Needs Clarification and ask one concise question.`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.2
    })
    return parseClassification(response.choices[0].message.content)
  } catch (error) {
    console.warn('Groq classification failed, using local fallback:', error.message)
    return getFallbackCategorization(message)
  }
}

function getFallbackCategorization(message) {
  const lowerMessage = message.toLowerCase()
  let category = 'Other / Needs Clarification'
  if (lowerMessage.includes('refund') || lowerMessage.includes('cancel') || lowerMessage.includes('close my account')) category = 'Cancellation & Refund'
  else if (lowerMessage.includes('payment') || lowerMessage.includes('bill') || lowerMessage.includes('charge') || lowerMessage.includes('invoice')) category = 'Billing & Payments'
  else if (lowerMessage.includes('login') || lowerMessage.includes('sign in') || lowerMessage.includes('password') || lowerMessage.includes('access my account')) category = 'Account & Access'
  else if (lowerMessage.includes('outage') || lowerMessage.includes('server is down') || lowerMessage.includes('everyone')) category = 'Service Outage'
  else if (lowerMessage.includes('feature') || lowerMessage.includes('add ') || lowerMessage.includes('dark mode') || lowerMessage.includes('would like to see')) category = 'Feature Request'
  else if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('not working') || lowerMessage.includes('loading') || lowerMessage.includes('slow')) category = 'Technical Support'
  else if (lowerMessage.includes('how ') || lowerMessage.includes('what ') || lowerMessage.includes('can i') || lowerMessage.includes('?')) category = 'Product Question'
  else if (lowerMessage.includes('thank') || lowerMessage.includes('great') || lowerMessage.includes('love')) category = 'Feedback & Praise'

  return {
    category,
    confidence: category === 'Other / Needs Clarification' ? 0.25 : 0.6,
    evidence: category === 'Other / Needs Clarification' ? 'No supported intent was clear from the message.' : `The message contains language associated with ${category}.`,
    reasoning: category === 'Other / Needs Clarification' ? 'There is not enough information to safely route this message.' : `The message was matched to ${category} using its stated intent.`,
    needsClarification: category === 'Other / Needs Clarification',
    clarifyingQuestion: category === 'Other / Needs Clarification' ? 'What product area are you contacting us about, and what outcome do you need?' : ''
  }
}
