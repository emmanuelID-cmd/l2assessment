import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { categorizeMessage } from '../utils/llmHelper'
import { calculateUrgency } from '../utils/urgencyScorer'
import { getRecommendedAction } from '../utils/templates'
import { generateCustomerResponse } from '../utils/responseGenerator'

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [isChatLoading, setIsChatLoading] = useState(false)

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

      // Save to history
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.push(analysisResult)
      localStorage.setItem('triageHistory', JSON.stringify(history))
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
  }

  const handleChatSubmit = async () => {
    if (!results || !chatInput.trim() || isChatLoading) return

    const question = chatInput.trim()
    setChatInput('')
    setChatMessages(current => [...current, { role: 'user', content: question }])
    setIsChatLoading(true)

    try {
      const chatContext = `${results.message}\n\nFollow-up request within the ${results.category} category: ${question}`
      const response = await generateCustomerResponse(chatContext, results, results.urgency)
      setChatMessages(current => [...current, { role: 'assistant', content: response }])
    } finally {
      setIsChatLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
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
              disabled={isLoading}
            />
            <div className="text-sm text-gray-500 mt-1">
              {message.length} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
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
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis Results</h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Category</div>
                <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                  {results.category}
                </div>
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

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Confidence</div>
                <div className="text-gray-700">{Math.round(results.confidence * 100)}%</div>
              </div>

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
                  Follow-up answers stay within the {results.category} support category.
                </p>
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
                <div className="flex space-x-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChatSubmit() }}
                    placeholder="Ask a category-specific follow-up..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isChatLoading ? 'Thinking...' : 'Ask'}
                  </button>
                </div>
              </div>
            </div>

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
