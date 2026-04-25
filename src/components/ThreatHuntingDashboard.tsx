import { useMemo, useState } from "react"

const INVESTIGATION_TYPES = [
  "recent_cloudtrail_events",
  "failed_console_logins",
  "suspicious_iam_activity",
  "ec2_instance_creation_activity",
  "ec2_security_group_changes",
  "root_account_activity",
  "new_access_keys_created",
  "failed_api_calls",
]

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT

function toInvestigationLabel(value: string) {
  const labelMap: Record<string, string> = {
    recent_cloudtrail_events: "Recent AWS Activity",
    failed_console_logins: "Failed Console Logins",
    suspicious_iam_activity: "Suspicious IAM Activity",
    ec2_instance_creation_activity: "EC2 Instance Creation Activity",
    ec2_security_group_changes: "EC2 Security Group Changes",
    root_account_activity: "Root Account Activity",
    new_access_keys_created: "New Access Keys Created",
    failed_api_calls: "Failed API Calls",
  }

  return labelMap[value] || value
}

type InvestigationDetail = Record<string, string>

type InvestigationResponse = {
  status: "success" | "error"
  investigation_type: string
  summary: string
  details: InvestigationDetail[]
  statistics: {
    total_events: number
    unique_ips: number
  }
  recommended_actions: string[]
}

function toLabel(key: string) {
  const labelMap: Record<string, string> = {
    time_dt: "Time",
    operation: "Operation",
    ip: "IP Address",
    name: "User",
    status: "Status",
    accountid: "Account ID",
    region: "Region",
    error: "Error",
    message: "Message",
  }

  if (labelMap[key]) return labelMap[key]

  const normalized = key.replace(/_/g, " ")
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getStatusBadgeClass(value?: string) {
  const normalized = (value || "").toLowerCase()

  if (["success", "succeeded", "passed"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
  }

  if (["failed", "failure", "error", "denied", "cancelled"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/30"
  }

  return "bg-slate-700/40 text-slate-300 border border-slate-600"
}

export default function ThreatHuntingDashboard() {
  const [investigationType, setInvestigationType] = useState("recent_cloudtrail_events")
  const [days, setDays] = useState("7")
  const [ipAddress, setIpAddress] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [response, setResponse] = useState<InvestigationResponse | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const visibleDetails = useMemo(() => {
    return response?.details?.slice(0, visibleCount) || []
  }, [response, visibleCount])

  const columns = useMemo(() => {
    if (!response?.details?.length) return []
    return Object.keys(response.details[0])
  }, [response])

  async function runInvestigation() {
    setLoading(true)
    setError("")

    try {
      const payload: Record<string, string> = {
        investigation_type: investigationType,
        days,
      }

      if (ipAddress.trim()) payload.ip_address = ipAddress.trim()
      if (username.trim()) payload.username = username.trim()

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || data.status === "error") {
        throw new Error(data.summary || data.message || "Investigation request failed.")
      }

      setResponse(data)
      setVisibleCount(10)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred."
      setError(message)
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div>
          <h1 className="text-4xl font-bold">Nobleaxis AI Threat Hunting Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Investigate AWS activity through your threat hunting API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Investigation Type</label>
            <select
              value={investigationType}
              onChange={(e) => setInvestigationType(e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            >
              {INVESTIGATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {toInvestigationLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Days</label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">IP Address</label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500 break-all"></div>

          <button
            onClick={runInvestigation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-900/30 transition"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Running Investigation...
              </>
            ) : (
              "Run Investigation"
            )}
          </button>
        </div>

        {error ? (
          <div className="bg-red-950/50 border border-red-800 text-red-200 rounded-3xl p-4">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Summary of Findings</h2>
            <p className="text-slate-300">
              {response?.summary || "No investigation has been run yet."}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="text-slate-400 text-sm">Total Events</div>
                <div className="text-3xl font-bold mt-1">
                  {response?.statistics?.total_events ?? 0}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="text-slate-400 text-sm">Unique IPs</div>
                <div className="text-3xl font-bold mt-1">
                  {response?.statistics?.unique_ips ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recommended Actions</h2>
          <ul className="space-y-3 text-slate-300 list-disc list-inside">
            {(response?.recommended_actions?.length
              ? response.recommended_actions
              : ["Run an investigation to see recommended actions."]
            ).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Raw Event Logs</h2>

          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                {columns.length ? (
                  columns.map((column) => (
                    <th key={column} className="py-3 pr-4 whitespace-nowrap">
                      {toLabel(column)}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3 pr-4">Operation</th>
                    <th className="py-3 pr-4">IP</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Account</th>
                    <th className="py-3 pr-4">Region</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {response?.details?.length ? (
                visibleDetails.map((detail, index) => (
                  <tr key={index} className="border-b border-slate-800/60">
                    {columns.map((column) => (
                      <td key={column} className="py-3 pr-4 text-slate-300 align-top whitespace-nowrap">
                        {column === "status" ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(detail[column])}`}>
                            {detail[column] || "N/A"}
                          </span>
                        ) : (
                          detail[column] || "N/A"
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length || 6} className="py-10 text-center text-slate-500">
                    No event data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {response?.details?.length > 10 && (
            <div className="mt-6 flex justify-center">
              {visibleCount < response.details.length ? (
                <button
                  onClick={() => setVisibleCount((count) => count + 10)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition"
                >
                  Show More
                </button>
              ) : (
                <button
                  onClick={() => setVisibleCount(10)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}