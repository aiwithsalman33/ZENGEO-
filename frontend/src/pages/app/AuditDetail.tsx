import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 9 (results UI).
export default function AuditDetail() {
  return (
    <>
      <PageHeader title="Audit" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Results render once the audit engine lands.
        </CardContent>
      </Card>
    </>
  )
}
