import { config } from '@/lib/config'

export const QUESTION_DURATION_MS = config.questionDurationMs
export const REVEAL_DURATION_MS = 3_000
export const VIDEO_DURATION_MS = 10_000

export const TEAM_LABELS: Record<string, string> = {
  viktor: 'Equipe Viktor',
  lucas: 'Equipe Lucas',
}

export const TEAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  viktor: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600' },
  lucas: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
}
