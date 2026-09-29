import Groq from 'groq-sdk'
import { CATEGORY_DEFINITIONS } from './llmHelper'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

export async function generateCustomerResponse(message, classification, urgency) {
  const { category, needsClarification, clarifyingQuestion } = classification
  if (!import.meta.env.VITE_GROQ_API_KEY || isClearlyOutOfDomain(message, category)) {
    return getFallbackResponse(classification, urgency, isClearlyOutOfDomain(message, category))
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You draft a concise customer support response. You may only address the category ${category}: ${CATEGORY_DEFINITIONS[category]}. Do not answer unrelated questions, invent account facts, promise refunds, diagnose with certainty, or request passwords, API keys, full card numbers, or other secrets. If the category needs clarification, ask for the missing details instead of guessing. Return only the response text.`
        },
        {
          role: 'user',
          content: `Customer message: ${message}\nUrgency: ${urgency}\nNeeds clarification: ${needsClarification}\nSuggested clarification question: ${clarifyingQuestion}`
        }
      ],
      temperature: 0.3
    })
    return response.choices[0].message.content.trim()
  } catch (error) {
    console.warn('Groq response generation failed, using local fallback:', error.message)
    return getFallbackResponse(classification, urgency, isClearlyOutOfDomain(message, category))
  }
}

function isClearlyOutOfDomain(message, category) {
  if (category !== 'Product Question' && category !== 'Other / Needs Clarification') return false
  const supportedTerms = ['account', 'billing', 'bill', 'payment', 'charge', 'invoice', 'subscription', 'refund', 'cancel', 'login', 'sign in', 'password', 'access', 'error', 'bug', 'broken', 'issue', 'problem', 'loading', 'outage', 'server', 'feature', 'product', 'app', 'dashboard', 'email', 'storage', 'message', 'customer', 'support']
  const lowerMessage = message.toLowerCase()
  return !supportedTerms.some(term => lowerMessage.includes(term))
}

function getFallbackResponse(classification, urgency, outOfDomain = false) {
  const { category, clarifyingQuestion } = classification
  if (outOfDomain) return 'I can help with supported customer-support topics such as billing, account access, technical issues, outages, product questions, and feature requests. Please provide a question related to one of those areas.'
  if (category === 'Other / Needs Clarification') return clarifyingQuestion || 'Could you provide the product area, what you expected to happen, and what happened instead?'
  if (category === 'Feature Request') return 'Thanks for the suggestion. We will share it with the product team for consideration. Please tell us how you would use this feature and which details matter most.'
  if (category === 'Technical Support' || category === 'Service Outage') return `Thanks for reporting this. Please share the steps that led to the issue, the exact error message, and the browser and device you are using.${urgency === 'High' ? ' Please also include the business impact so the support team can prioritize it.' : ''}`
  if (category === 'Billing & Payments' || category === 'Cancellation & Refund') return 'We can help investigate this. Please provide the date, amount, and relevant account context, but do not share passwords, API keys, or full payment card numbers.'
  if (category === 'Account & Access') return 'We can help with account access. Please describe the step where access fails and include the exact error message. Do not share your password or recovery codes.'
  if (category === 'Feedback & Praise') return 'Thank you for sharing your feedback. We appreciate it and will pass the relevant comments to the team.'
  return `Thanks for reaching out about ${category.toLowerCase()}. Please share the specific product area and the outcome you need so we can help.`
}
