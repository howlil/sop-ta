/** Meta pagination lintas feature — selaras server `toPaginatedData` (`pagination` di dalam `data`). */
export interface PaginationMetaDto {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}
