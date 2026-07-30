import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 12.
export default function AdminActivity() {
  return (
    <>
      <PageHeader title="Activity log" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Admin action history lands with the admin endpoints.
        </CardContent>
      </Card>
    </>
  )
}
