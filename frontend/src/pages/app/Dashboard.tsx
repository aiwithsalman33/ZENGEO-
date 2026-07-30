import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 11 (KPI aggregation + charts).
export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your GEO score at a glance." />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Dashboard widgets arrive with the KPI endpoints.
        </CardContent>
      </Card>
    </>
  )
}
