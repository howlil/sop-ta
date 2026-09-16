import { createFileRoute } from '@tanstack/react-router'
import { WorkItemsPage } from '@/pages/work-items/WorkItemsPage'

export const Route = createFileRoute('/kepala-opd/')({
  component: WorkItemsPage,
})
