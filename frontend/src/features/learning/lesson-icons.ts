import { FileText, ListChecks, Video } from 'lucide-react'
import type { LessonType } from '@/types/catalog'

export const LESSON_ICONS: Record<LessonType, typeof Video> = {
  video: Video,
  text: FileText,
  file: FileText,
  quiz: ListChecks,
}
