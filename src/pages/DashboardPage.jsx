import { useState } from 'react'
import HistoryStatus from '../components/HistoryStatus'
import { readHistory } from '../utils/historyStore'
import { buildUrgencyInsights } from '../utils/dashboardInsights'

function getDashboardData() {
  const historyStatus = readHistory()
  const history = historyStatus.records
  const today = new Date().toDateString()
  const todayMessages = history.filter(item => new Date(item.timestamp).toDateString() === today)
  const highUrgency = history.filter(item => item.urgency === 'High').length
  const categories = {}
  const classifiedHistory = history.filter(item => !item.needsCategoryReview)
  classifiedHistory.forEach(item => {
    categories[item.category] = (categories[item.category] || 0) + 1
  })
  const urgency = { High: 0, Medium: 0, Low: 0 }
  history.forEach(item => {
    urgency[item.urgency] = (urgency[item.urgency] || 0) + 1
  })

  return {
    stats: {
      total: history.length,
      today: todayMessages.length,
      highUrgencyPercent: history.length > 0 ? Math.round((highUrgency / history.length) * 100) : 0,
      avgPerDay: Math.round(history.length / (history.length > 0 ? 7 : 1))
    },
    categoryData: Object.entries(categories).map(([name, count]) => ({ name, count })),
    classifiedTotal: classifiedHistory.length,
    urgencyData: urgency,
    insights: buildUrgencyInsights(history),
    historyStatus
  }
}

function DashboardPage() {
  const [{ stats, categoryData, classifiedTotal, urgencyData, insights, historyStatus }] = useState(getDashboardData)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <HistoryStatus {...historyStatus} />
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of message triage analytics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Messages</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Today</div>
            <div className="text-3xl font-bold text-green-600">{stats.today}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">High Urgency</div>
            <div className="text-3xl font-bold text-red-600">{stats.highUrgencyPercent}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Per Day</div>
            <div className="text-3xl font-bold text-purple-600">{stats.avgPerDay}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">Based on {classifiedTotal} tickets without a category review flag.</p>
            {categoryData.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No data yet</div>
            ) : (
              <div className="space-y-3">
                {categoryData.map((cat) => {
                  const percentage = classifiedTotal > 0 ? (cat.count / classifiedTotal) * 100 : 0
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{cat.name}</span>
                        <span className="text-gray-600">{cat.count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Urgency Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Urgency Breakdown</h2>
            {stats.total === 0 ? (
              <div className="text-center text-gray-500 py-8">No data yet</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span className="text-gray-700">High</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{urgencyData.High}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-gray-700">Medium</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{urgencyData.Medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="text-gray-700">Low</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{urgencyData.Low}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Insights Section */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6" aria-labelledby="insights-title">
          <h2 id="insights-title" className="text-lg font-bold text-blue-900 mb-2">Insights by urgency</h2>
          <p className="text-sm text-blue-800 mb-4">Closed tickets grouped by urgency and category, with a brief summary of the issues in each group. Tickets needing category review are counted separately.</p>
          {stats.total === 0 ? (
            <p className="text-sm text-blue-800">Close a case to see insights here.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {insights.map(band => (
                <section key={band.urgency} className="rounded-lg border border-blue-200 bg-white p-4" aria-label={`${band.urgency} urgency insights`}>
                  <h3 className="font-bold text-gray-900">{band.urgency} urgency <span className="text-gray-600 font-normal">({band.total})</span></h3>
                  {band.total === 0 ? <p className="mt-2 text-sm text-gray-600">No tickets in this band.</p> : (
                    <div className="mt-3 space-y-3">
                      {band.categories.map(category => (
                        <div key={category.name} className="border-t border-gray-100 pt-2">
                          <p className="text-sm font-semibold text-gray-900">{category.count} {category.name}</p>
                          <p className="text-sm text-gray-600">{category.summary}</p>
                        </div>
                      ))}
                      {band.pendingReview > 0 && <p className="border-t border-gray-100 pt-2 text-sm text-yellow-900">{band.pendingReview} awaiting category review</p>}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
