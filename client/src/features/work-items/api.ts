import { apiClient } from '@/shared/api/api-client'
import { unwrapApiData } from '@/shared/api/response'
import type { ApiSuccessResponse } from '@/types/dto/auth.dto'
import type { WorkItemsResponse } from './types'

export const workItemsApi = {
  list: () =>
    unwrapApiData(
      apiClient.get<ApiSuccessResponse<WorkItemsResponse>>('/work-items'),
    ),
}
