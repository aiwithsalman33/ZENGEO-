import { useEffect, useState } from 'react'

// Phase 1 placeholder: proves the browser -> Caddy -> FastAPI path works.
// Replaced by the router shell in phase 4.
export default function App() {
  const [status, setStatus] = useState<string>('checking…')

  useEffect(() => {
    fetch('/health/ready')
      .then((r) => r.json())
      .then((d) => setStatus(JSON.stringify(d)))
      .catch((e) => setStatus(`error: ${String(e)}`))
  }, [])

  return (
    <main className="glow-surface flex min-h-screen items-center justify-center p-6">
      <div className="card-surface max-w-lg space-y-3 p-8">
        <h1 className="text-2xl font-semibold">GEO Audit</h1>
        <p className="text-sm text-muted-foreground">Backend readiness:</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{status}</pre>
      </div>
    </main>
  )
}
