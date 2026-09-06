import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-keys'
import { workItemsApi } from './api'

export function useWorkItems() {
  return useQuery({
    queryKey: queryKeys.workItems,
    queryFn: workItemsApi.list,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
