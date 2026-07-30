import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 5 (profile, password, LLM keys, danger zone).
export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Profile, API keys and notification preferences land next.
        </CardContent>
      </Card>
    </>
  )
}
