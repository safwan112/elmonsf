export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  /** In-app path (the API drops anything else). */
  url: string | null
  read_at: string | null
  created_at: string | null
}

export interface Broadcast {
  id: number
  title: string
  body: string
  url: string | null
  audience: { value: 'all' | 'students' | 'instructors' | 'course'; label: string }
  course: { id: number; title: string } | null
  send_email: boolean
  status: 'queued' | 'sending' | 'sent' | 'failed'
  recipients_count: number
  sender: { id: number; name: string } | null
  sent_at: string | null
  created_at: string | null
}
