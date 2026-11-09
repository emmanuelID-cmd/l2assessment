import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import HistoryStatus from '../components/HistoryStatus'
import { HISTORY_KEY, readHistory } from '../utils/historyStore'

function HistoryPage() {
  const [historyStatus, setHistoryStatus] = useState(readHistory)
  const history = historyStatus.records
  const [filter, setFilter] = useState('all')
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [clearError, setClearError] = useState('')

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      try {
        localStorage.setItem(HISTORY_KEY, '[]')
        setHistoryStatus(readHistory())
        setClearError('')
      } catch {
        setClearError('History could not be cleared. Export your data and check browser storage settings.')
      }
    }
  }

  const sortedHistory = [...history].sort((a, b) => 
    a.message.localeCompare(b.message)
  )
  
  const filteredHistory = filter === 'all' 
    ? sortedHistory 
    : sortedHistory.filter(item => item.category === filter)

  const categories = [...new Set(history.map(item => item.category))]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <HistoryStatus {...historyStatus} showExport />
        {clearError && <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">{clearError}</div>}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
              <p className="text-gray-600">View and manage past message analyses</p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Filter Buttons */}
          {history.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({history.length})
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    filter === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category} ({history.filter(h => h.category === category).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History List */}
        {filteredHistory.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-xl text-gray-600 mb-2">{historyStatus.issues.length > 0 ? 'No readable history to display' : 'No history yet'}</div>
            <p className="text-gray-500 mb-6">
              Analyzed messages will appear here
            </p>
            <a
              href="/analyze"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Analyze a Message
            </a>
          </div>
        )}

        <div className="space-y-4">
          {filteredHistory.map(item => (
            <div
              key={item.storageIndex}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expandedIndex === item.storageIndex}
                className="p-4 cursor-pointer hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                onClick={() => setExpandedIndex(expandedIndex === item.storageIndex ? null : item.storageIndex)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpandedIndex(expandedIndex === item.storageIndex ? null : item.storageIndex)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div className="text-gray-800 font-medium mb-2">
                      "{item.message.substring(0, 100)}{item.message.length > 100 ? '...' : ''}"
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                        {item.category}
                      </span>
                      {item.needsCategoryReview && <span className="text-xs bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full font-semibold">Needs staff review</span>}
                      {item.categoryCorrections?.length > 0 && <span className="text-xs bg-green-100 text-green-900 px-3 py-1 rounded-full font-semibold">Category corrected</span>}
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        item.urgency === 'High' ? 'bg-red-200 text-red-900' :
                        item.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                        'bg-green-200 text-green-900'
                      }`}>
                        {item.urgency} Urgency
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 ml-4">
                    {expandedIndex === item.storageIndex ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {expandedIndex === item.storageIndex && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Full Message</div>
                      <div className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">
                        {item.message}
                      </div>
                    </div>
                    {item.followUpTurns?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Conversation</div>
                        <div className="space-y-2">
                          {item.initialCustomerResponse && (
                            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-gray-800">
                              <div className="font-semibold mb-1">Relay AI · initial response</div>
                              {item.initialCustomerResponse}
                            </div>
                          )}
                          {item.followUpTurns.map((turn, index) => (
                            <div key={index} className={`rounded border p-3 text-sm text-gray-800 ${turn.role === 'user' ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
                              <div className="font-semibold mb-1">{turn.role === 'user' ? 'Customer' : 'Relay AI'} · {turn.role === 'user' ? 'follow-up' : 'response'}</div>
                              {turn.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.needsCategoryReview && (
                      <p className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                        This category may be inaccurate and needs staff review. The saved ticket has not been changed.
                      </p>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">{item.needsCategoryReview ? 'Previous AI Reasoning (unverified)' : item.categoryCorrections?.length ? 'Review note' : 'AI Reasoning'}</div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown>
                            {item.reasoning}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    {item.evidence && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">{item.needsCategoryReview ? 'Previous Evidence (unverified)' : item.categoryCorrections?.length ? 'Review basis' : 'Evidence'}</div>
                        <div className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">
                          {item.evidence}
                        </div>
                      </div>
                    )}
                    {typeof item.confidence === 'number' && (
                      <div className="text-sm text-gray-600">
                        {item.needsCategoryReview ? 'Previous classification confidence' : 'Classification confidence'}: {Math.round(item.confidence * 100)}%
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">{item.needsCategoryReview ? 'Previous Recommended Action (unverified)' : 'Recommended Action'}</div>
                      <div className="text-sm text-gray-800 bg-purple-50 p-3 rounded border border-purple-200">
                        {item.recommendedAction}
                      </div>
                    </div>
                    {item.customerResponse && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">{item.needsCategoryReview ? 'Previous Suggested Response (unverified)' : 'Suggested Customer Response'}</div>
                        <div className="text-sm text-gray-800 bg-blue-50 p-3 rounded border border-blue-200">
                          {item.customerResponse}
                        </div>
                      </div>
                    )}
                    {item.categoryCorrections?.length > 0 && (
                      <div className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
                        <div className="font-semibold">Category corrected</div>
                        <div>Changed from {item.categoryCorrections.at(-1).previousCategory} to {item.category}.</div>
                        <div>Reason recorded: {item.categoryCorrections.at(-1).reason || item.evidence || 'The original customer message was reviewed; no further reason was saved.'}</div>
                        <div className="mt-2 font-semibold">Previous classification and response</div>
                        {item.categoryCorrections.at(-1).previousRecommendedAction && <div>Action: {item.categoryCorrections.at(-1).previousRecommendedAction}</div>}
                        {item.categoryCorrections.at(-1).previousCustomerResponse && <div>Response: {item.categoryCorrections.at(-1).previousCustomerResponse}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
