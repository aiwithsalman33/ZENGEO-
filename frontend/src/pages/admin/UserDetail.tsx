import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 12.
export default function AdminUserDetail() {
  return (
    <>
      <PageHeader title="User" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Per-user detail lands with the admin endpoints.
        </CardContent>
      </Card>
    </>
  )
}
