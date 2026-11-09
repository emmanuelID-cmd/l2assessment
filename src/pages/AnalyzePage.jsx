import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { categorizeMessage } from '../utils/llmHelper'
import { calculateUrgency } from '../utils/urgencyScorer'
import { getRecommendedAction } from '../utils/templates'
import { generateCustomerResponse, generateFollowUpResponse } from '../utils/responseGenerator'
import HistoryStatus from '../components/HistoryStatus'
import { appendHistory, readHistory } from '../utils/historyStore'
import { hasTruncatedFollowUps } from '../utils/followUpContext'
import { refineTicketWithFollowUp } from '../utils/ticketRefinement'
import { closeTicket } from '../utils/ticketCloseout'

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [historyStatus, setHistoryStatus] = useState(readHistory)
  const [saveError, setSaveError] = useState('')
  const [chatError, setChatError] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  useEffect(() => {
    // Check for example message from home page
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const handleAnalyze = async () => {
    if (!message.trim()) {
      alert('Please enter a message to analyze')
      return
    }

    setIsLoading(true)
    setResults(null)
    setChatInput('')
    setSaveError('')
    setChatError('')
    setIsClosed(false)
    
    try {
      // Run categorization (LLM call)
      const classification = await categorizeMessage(message)
      const { category, reasoning, confidence, evidence, needsClarification, clarifyingQuestion } = classification
      
      // Calculate urgency (rule-based)
      const urgency = calculateUrgency(message)
      
      // Get recommended action (template-based)
      const recommendedAction = getRecommendedAction(category)
      const customerResponse = await generateCustomerResponse(message, classification, urgency)
      
      const analysisResult = {
        message,
        category,
        initialCategory: category,
        initialRecommendedAction: recommendedAction,
        initialCustomerResponse: customerResponse,
        confidence,
        evidence,
        needsClarification,
        clarifyingQuestion,
        urgency,
        recommendedAction,
        customerResponse,
        reasoning,
        timestamp: new Date().toISOString()
      }

      setResults(analysisResult)
      setChatMessages([])
    } catch (error) {
      console.error('Error analyzing message:', error)
      alert('Error analyzing message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setResults(null)
    setChatInput('')
    setChatMessages([])
    setChatError('')
    setSaveError('')
    setIsClosed(false)
  }

  const handleChatSubmit = async () => {
    if (!results || !chatInput.trim() || isChatLoading || isClosed || isClosing) return

    const question = chatInput.trim()
    setIsChatLoading(true)
    setChatError('')

    try {
      const refined = refineTicketWithFollowUp(results, question)
      const response = await generateFollowUpResponse({
        originalMessage: results.message,
        initialResponse: results.initialCustomerResponse,
        classification: refined,
        urgency: results.urgency,
        turns: chatMessages,
        question
      })
      setResults({ ...refined, customerResponse: response })
      setChatMessages(current => [...current, { role: 'user', content: question }, { role: 'assistant', content: response }])
      setChatInput('')
    } catch (error) {
      setChatError(error.message || 'Live follow-up is unavailable. Please retry.')
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!results || isClosed || isClosing || isChatLoading) return
    setIsClosing(true)
    setSaveError('')
    try {
      const finalTicket = await closeTicket(results, chatMessages)
      appendHistory(finalTicket)
      setResults(finalTicket)
      setIsClosed(true)
      setHistoryStatus(readHistory())
    } catch (error) {
      setSaveError(error.message || 'The ticket could not be saved. Export your history and try again.')
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <HistoryStatus {...historyStatus} />
        {saveError && <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">Ticket was not saved: {saveError}</div>}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Customer Message</h1>
          <p className="text-gray-600 mb-6">
            Paste a customer support message below to automatically categorize and prioritize.
          </p>

          {/* Input Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste customer message here..."
              className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || isChatLoading || isClosing}
            />
            <div className="text-sm text-gray-500 mt-1">
              {message.length} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || isChatLoading || isClosing}
              className={`flex-1 py-3 rounded-lg font-semibold ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Analyze Message'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isLoading || isChatLoading || isClosing}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{isClosed ? 'Closed Ticket' : 'Draft Analysis'}</h2>
            <p className="text-sm text-gray-600 mb-4">{isClosed ? 'This ticket and its final category were saved in this browser.' : 'The category is provisional until you close the case. Follow-ups can clarify the issue before it is saved to History.'}</p>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">{isClosed ? 'Final Category' : 'Provisional Category'}</div>
                <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                  {results.category}
                </div>
                {results.category !== results.initialCategory && <p className="mt-2 text-sm text-gray-700">Started as {results.initialCategory}. {isClosed ? results.categoryCorrections?.[0]?.reason : results.categoryReason}</p>}
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Urgency Level</div>
                <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                  results.urgency === 'High' ? 'bg-red-200 text-red-900' :
                  results.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                  'bg-green-200 text-green-900'
                }`}>
                  {results.urgency}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">AI Reasoning</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>
                      {results.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Evidence</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
                  {results.evidence}
                </div>
              </div>

              {typeof results.confidence === 'number' && <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Confidence</div>
                <div className="text-gray-700">{Math.round(results.confidence * 100)}%</div>
              </div>}

              {results.needsClarification && results.clarifyingQuestion && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-900">
                  <div className="text-sm font-semibold mb-1">Clarification Needed</div>
                  {results.clarifyingQuestion}
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Recommended Action</div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-gray-800">{results.recommendedAction}</p>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Suggested Customer Response</div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-800">
                  {results.customerResponse}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm font-semibold text-gray-600 mb-1">Ask Relay AI a Follow-up</div>
                <p className="text-sm text-gray-500 mb-3">
                  Follow-up answers stay within the current {results.category} support category and require a local Groq key. Clarifications may update the provisional category.
                </p>
                {hasTruncatedFollowUps(chatMessages) && (
                  <p role="status" className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                    I may not have every detail from earlier follow-ups. If I miss something, please paste the relevant message or give me a brief recap, and I’ll continue from there. Thank you!
                  </p>
                )}
                {chatError && <div role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{chatError}</div>}
                {chatMessages.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {chatMessages.map((chatMessage, index) => (
                      <div
                        key={`${chatMessage.role}-${index}`}
                        className={`rounded-lg p-3 text-sm ${chatMessage.role === 'user' ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-gray-800'}`}
                      >
                        <div className="font-semibold mb-1">{chatMessage.role === 'user' ? 'You' : 'Relay AI'}</div>
                        {chatMessage.content}
                      </div>
                    ))}
                  </div>
                )}
                {!isClosed && <div className="flex space-x-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChatSubmit() }}
                    placeholder="Ask a category-specific follow-up..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isChatLoading || isClosing}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || isClosing || !chatInput.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isChatLoading ? 'Thinking...' : 'Ask'}
                  </button>
                </div>}
              </div>
            </div>

            {!isClosed && <div className="mt-6 border-t border-gray-200 pt-4">
              <button type="button" onClick={handleCloseTicket} disabled={isClosing || isChatLoading}
                className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                {isClosing ? 'Closing case...' : 'Close case and save ticket'}
              </button>
              <p className="mt-2 text-sm text-gray-600">Closing uses the conversation to finalize the category and saves the ticket in this browser. It does not send it to a support queue.</p>
            </div>}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const text = `Category: ${results.category}\nUrgency: ${results.urgency}\nRecommendation: ${results.recommendedAction}\n\nSuggested Customer Response: ${results.customerResponse}\n\nReasoning: ${results.reasoning}`
                  navigator.clipboard.writeText(text)
                  alert('Results copied to clipboard!')
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold"
              >
                📋 Copy Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzePage
