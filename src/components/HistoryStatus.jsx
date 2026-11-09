function HistoryStatus({ issues, raw, showExport = false, onExport }) {
  const exportHistory = () => {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'triage-history-raw.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    onExport?.()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (issues.length === 0 && !showExport) return null

  return (
    <div id="history-export" className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-900">Saved history</div>
          <p className="text-sm text-gray-600">Export the original browser data before clearing it.</p>
        </div>
        <button type="button" onClick={exportHistory} disabled={raw === null}
          className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
          Export raw JSON
        </button>
      </div>
      {issues.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-900">
          <p className="font-semibold">Some saved history needs review.</p>
          <p className="text-sm">The original data has not been changed. Export it for review by support staff.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {issues.map((issue, index) => <li key={index}>{issue}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default HistoryStatus
