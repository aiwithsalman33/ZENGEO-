import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 6 (multi-step questionnaire).
export default function NewAudit() {
  return (
    <>
      <PageHeader title="Run an audit" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          The audit questionnaire arrives with the business endpoints.
        </CardContent>
      </Card>
    </>
  )
}
