import { useState, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar
} from "recharts"

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT

const REGIONS = [
  "us-east-1","us-east-2","us-west-1","us-west-2",
  "eu-west-1","eu-central-1",
  "ap-southeast-1","ap-southeast-2","ap-northeast-1"
]

const TIME_RANGES = [
  { label: "Last 1 Hour", value: "1" },
  { label: "Last 6 Hours", value: "6" },
  { label: "Last 12 Hours", value: "12" },
  { label: "Last 24 Hours", value: "24" },
  { label: "Last 7 Days", value: "168" },
]

export default function ThreatHuntingDashboard() {
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState("us-east-1")
  const [timeRange, setTimeRange] = useState("24")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [response, setResponse] = useState<any>(null)

  // Severity
  function getSeverity() {
    const total = response?.statistics?.total_events || 0
    if (total > 50) return { label: "CRITICAL", color: "#ef4444" }
    if (total > 20) return { label: "HIGH", color: "#f97316" }
    if (total > 5) return { label: "MEDIUM", color: "#eab308" }
    return { label: "LOW", color: "#22c55e" }
  }

  // Suspicious IPs
  const suspiciousIPs = useMemo(() => {
    return new Set(
      (response?.details || [])
        .filter((d: any) => d.status === "Failed")
        .map((d: any) => d.ip)
    )
  }, [response])

  // Timeline
  const timelineData = useMemo(() => {
    if (!response?.details) return []

    const map: any = {}

    response.details.forEach((event: any) => {
      const time = event.time_dt?.slice(11, 16)

      if (!map[time]) map[time] = { time, count: 0 }
      map[time].count++
    })

    return Object.values(map).sort((a: any, b: any) =>
      a.time.localeCompare(b.time)
    )
  }, [response])

  // Distribution
  const statusData = useMemo(() => {
    if (!response?.details) return []

    const success = response.details.filter((d: any) => d.status === "Success").length
    const failed = response.details.filter((d: any) => d.status === "Failed").length

    return [
      { name: "Success", value: success },
      { name: "Failed", value: failed }
    ]
  }, [response])

  async function runSearch() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investigation_type: "recent_cloudtrail_events",
          days: timeRange,
          region,
          query
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Request failed")

      setResponse(data)

    } catch (err: any) {
      setError(err.message)
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "#0b0f1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "Segoe UI" }}>

      {/* HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "15px 30px",
        background: "rgba(15,20,35,0.95)"
      }}>
        <div><strong>AWS</strong> Threat Hunting</div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="pulse" />
          Live
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <div style={{ display: "flex", gap: "10px", background: "#111827", padding: "10px", borderRadius: "10px" }}>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threats..."
            style={{ background: "transparent", border: "none", color: "white" }}
          />

          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            {TIME_RANGES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>

          <button onClick={runSearch} disabled={loading}>
            {loading ? <span className="spinner" /> : "⚡ Run Hunt"}
          </button>

        </div>
      </div>

      {error && <div style={{ color: "red", textAlign: "center" }}>{error}</div>}

      {/* SEVERITY */}
      {response && (
        <div style={{
          margin: "20px",
          padding: "15px",
          borderLeft: `5px solid ${getSeverity().color}`
        }}>
          Threat Level: {getSeverity().label}
        </div>
      )}

      {/* MAIN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px", padding: "30px" }}>

        {/* LEFT */}
        <div>

          <Card title="Summary">
            {response?.summary}
          </Card>

          <Card title="Recommended Actions">
            {(response?.recommended_actions || []).map((a: string) => <div key={a}>{a}</div>)}
          </Card>

          {suspiciousIPs.size > 0 && (
            <Card title="Suspicious IPs">
              {[...suspiciousIPs].map(ip => (
                <span key={ip} style={{ color: "#fca5a5", marginRight: "5px" }}>{ip}</span>
              ))}
            </Card>
          )}

        </div>

        {/* RIGHT */}
        <div>

          <Card title="Attack Timeline">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData}>
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line dataKey="count" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Event Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Event Logs">
            <table style={{ width: "100%" }}>
              <tbody>
                {(response?.details || []).map((row: any, i: number) => (
                  <tr key={i}>
                    <td>{row.time_dt}</td>
                    <td>{row.operation}</td>
                    <td style={{ color: suspiciousIPs.has(row.ip) ? "#fca5a5" : "#e2e8f0" }}>{row.ip}</td>
                    <td style={{ color: row.status === "Failed" ? "red" : "green" }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

        </div>

      </div>

    </div>
  )
}

function Card({ title, children }: any) {
  return (
    <div style={{
      background: "#111827",
      padding: "20px",
      borderRadius: "10px",
      marginBottom: "15px"
    }}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}