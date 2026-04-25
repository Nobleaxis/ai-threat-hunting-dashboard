import { useAuth } from "react-oidc-context"
import ThreatHuntingDashboard from "./components/ThreatHuntingDashboard"

export default function App() {
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading authentication...
      </div>
    )
  }

  if (auth.error) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-300 flex items-center justify-center">
        Authentication error: {auth.error.message}
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Nobleaxis AI Threat Hunting Dashboard</h1>
        <p className="text-slate-400">Sign in to continue.</p>
        <button
          onClick={() => auth.signinRedirect()}
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-semibold"
        >
          Sign In
        </button>
      </div>
    )
  }

  return <ThreatHuntingDashboard />
}