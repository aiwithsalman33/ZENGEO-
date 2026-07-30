import { PageHeader } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'

// Fully implemented in phase 12.
export default function AdminUsers() {
  return (
    <>
      <PageHeader title="Users" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          The user table lands with the admin endpoints.
        </CardContent>
      </Card>
    </>
  )
}
