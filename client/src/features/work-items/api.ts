import { apiClient } from '@/lib/api/api-client'
import { unwrapApiData } from '@/lib/api/response'
import type { ApiSuccessResponse } from '@/types/dto/auth.dto'
import type { WorkItemsResponse } from './types'

export const workItemsApi = {
  list: () =>
    unwrapApiData(
      apiClient.get<ApiSuccessResponse<WorkItemsResponse>>('/work-items'),
    ),
}
