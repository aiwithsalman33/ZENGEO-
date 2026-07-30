import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 12.
export default function AdminAudits() {
  return (
    <>
      <PageHeader title="All audits" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          The cross-user audit table lands with the admin endpoints.
        </CardContent>
      </Card>
    </>
  )
}
