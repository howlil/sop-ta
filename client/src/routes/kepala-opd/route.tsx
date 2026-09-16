import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/app/layout/DashboardLayout'
import { RouteErrorPage } from '@/shared/ui/route-error'
import { requireRoles } from '@/app/stores/authStore'
import { ROLES } from '@/shared/lib/constants'

export const Route = createFileRoute('/kepala-opd')({
  // Authenticated dashboard data depends on browser-managed session state.
  ssr: false,
  beforeLoad: requireRoles([ROLES.KEPALA_OPD]),
  component: DashboardLayout,
  errorComponent: ({ error, reset }) => <RouteErrorPage error={error} reset={reset} />,
})