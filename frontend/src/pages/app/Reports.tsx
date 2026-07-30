import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 10 (PDF reports + history).
export default function Reports() {
  return (
    <>
      <PageHeader title="Reports" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Past audits and PDF downloads appear here.
        </CardContent>
      </Card>
    </>
  )
}
