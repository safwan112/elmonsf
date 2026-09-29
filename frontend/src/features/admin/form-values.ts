import type { AdminQuestionOption } from '@/types/admin'

export type FormValues = Record<string, unknown>

export interface SelectOption {
  value: string
  label: string
}

interface BaseField {
  name: string
  label: string
  hint?: string
  required?: boolean
  /** Full width in the two-column form grid. */
  wide?: boolean
}

export type FieldDef = BaseField &
  (
    | { type: 'text' | 'email' | 'url'; placeholder?: string; dir?: 'ltr' | 'rtl'; maxLength?: number }
    | { type: 'textarea' | 'markdown'; rows?: number; placeholder?: string }
    /** Empty numbers send null (clears the value) unless `omitEmpty` (server keeps its value). */
    | { type: 'number' | 'money'; min?: number; max?: number; step?: number; omitEmpty?: boolean }
    | { type: 'select'; options: SelectOption[]; placeholder?: string; numeric?: boolean }
    | { type: 'switch' }
    | { type: 'datetime' }
    | { type: 'tags' }
    | { type: 'lines'; rows?: number }
    /** Uploads to the media library and submits its id; `previewKey` is the URL field of the record. */
    | { type: 'image'; previewKey: string }
    | { type: 'options' }
  )

/** ISO timestamp → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Starting values for a form: strings for inputs, booleans for switches. */
export function initialValues(fields: FieldDef[], source: Record<string, unknown> = {}): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    const raw = source[field.name]
    switch (field.type) {
      case 'switch':
        values[field.name] = Boolean(raw)
        break
      case 'datetime':
        values[field.name] = toLocalInput(raw as string | null)
        break
      case 'tags':
        values[field.name] = Array.isArray(raw) ? raw.join('، ') : ''
        break
      case 'lines':
        values[field.name] = Array.isArray(raw) ? raw.join('\n') : ''
        break
      case 'image':
        // undefined = unchanged; the current image is shown from the record's URL.
        values[field.name] = undefined
        values[`${field.name}__preview`] = source[field.previewKey] ?? null
        break
      case 'options':
        values[field.name] = Array.isArray(raw) && raw.length > 0
          ? (raw as AdminQuestionOption[]).map((o) => ({ id: o.id, body: o.body, is_correct: o.is_correct }))
          : [
              { body: '', is_correct: true },
              { body: '', is_correct: false },
              { body: '', is_correct: false },
              { body: '', is_correct: false },
            ]
        break
      default:
        values[field.name] = raw === null || raw === undefined ? '' : String(raw)
    }
  }
  return values
}

/** Convert form state to the API payload. */
export function serialize(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = values[field.name]
    switch (field.type) {
      case 'switch':
        body[field.name] = Boolean(raw)
        break
      case 'number':
      case 'money':
        if (raw === '' || raw === null || raw === undefined) {
          if (!(field.omitEmpty || field.name === 'sort_order')) body[field.name] = null
        } else {
          body[field.name] = Number(raw)
        }
        break
      case 'select':
        if (raw === '' || raw === undefined || raw === null) {
          // Empty id select clears the relation; an empty enum select is
          // left out so the server keeps its default/current value.
          if (field.numeric) body[field.name] = null
        } else {
          body[field.name] = field.numeric ? Number(raw) : raw
        }
        break
      case 'datetime':
        body[field.name] = raw ? new Date(String(raw)).toISOString() : null
        break
      case 'tags':
        body[field.name] = String(raw ?? '')
          .split(/[,،]/)
          .map((t) => t.trim())
          .filter(Boolean)
        break
      case 'lines':
        body[field.name] = String(raw ?? '')
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
        break
      case 'image':
        if (raw !== undefined) body[field.name] = raw
        break
      case 'options':
        body[field.name] = (raw as AdminQuestionOption[]).filter((o) => o.body.trim() !== '')
        break
      default: {
        const text = String(raw ?? '').trim()
        body[field.name] = text === '' ? null : text
      }
    }
  }
  return body
}
