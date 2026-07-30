import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 12 (platform KPIs).
export default function AdminOverview() {
  return (
    <>
      <PageHeader title="Platform overview" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Platform-wide KPIs land with the admin endpoints.
        </CardContent>
      </Card>
    </>
  )
}
