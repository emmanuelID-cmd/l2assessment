import Groq from 'groq-sdk'
import { CATEGORY_DEFINITIONS, CATEGORY_NAMES } from './categories'
import { getRuleClassification } from './categoryRules'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

function parseClassification(content) {
  const parsed = JSON.parse(content)
  const category = CATEGORY_NAMES.includes(parsed.category) ? parsed.category : 'Other / Needs Clarification'
  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
    evidence: typeof parsed.evidence === 'string' ? parsed.evidence : 'The message needs more detail to identify the relevant support domain.',
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'The message was classified using its stated intent and available details.',
    needsClarification: parsed.needsClarification === true || category === 'Other / Needs Clarification',
    clarifyingQuestion: typeof parsed.clarifyingQuestion === 'string' ? parsed.clarifyingQuestion : ''
  }
}

export async function categorizeMessage(message) {
  const rule = getRuleClassification(message)
  const classification = {
    category: rule.category,
    confidence: rule.confidence,
    evidence: rule.evidence,
    reasoning: rule.reasoning,
    needsClarification: rule.needsClarification,
    clarifyingQuestion: rule.clarifyingQuestion
  }
  if (rule.strong || !import.meta.env.VITE_GROQ_API_KEY) return classification

  try {
    const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You classify messages about Relay AI, a customer-operations product. Return only valid JSON with these fields: category, confidence, evidence, reasoning, needsClarification, clarifyingQuestion. Choose exactly one category from this list: ${JSON.stringify(CATEGORY_DEFINITIONS)}. Confidence must be a number from 0 to 1. If the message is mixed, unclear, or unrelated to Relay AI support, use Other / Needs Clarification and ask one concise question. Do not classify an unrelated question as Product Question merely because it has a question mark.`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.2
    })
    return parseClassification(response.choices[0].message.content)
  } catch (error) {
    console.warn('Groq classification failed, using local fallback:', error.message)
    return classification
  }
}
