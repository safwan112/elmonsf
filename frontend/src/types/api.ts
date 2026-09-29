/** Envelope for a single resource: `{ data: T, message?: string }`. */
export interface ApiResource<T> {
  data: T
  message?: string
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
  path: string
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

/** Laravel paginated resource collection. */
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
  links: PaginationLinks
}

/** Error envelope produced by the backend's ApiExceptionRenderer. */
export interface ApiErrorBody {
  message: string
  code: string
  errors?: Record<string, string[]>
}
