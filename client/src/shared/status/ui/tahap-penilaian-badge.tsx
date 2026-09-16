import { cn } from '@/shared/lib/cn'
import type { TahapPenilaianSop } from '@/features/evaluation/model/evaluasi-domain'
import { getTahapPenilaianCopy } from '@/features/evaluation/model/evaluasi-domain'

export interface TahapPenilaianBadgeProps {
  tahap: TahapPenilaianSop
  className?: string
}

export function TahapPenilaianBadge({ tahap, className }: TahapPenilaianBadgeProps) {
  const copy = getTahapPenilaianCopy(tahap)
  return (
    <span
      className={cn(
        'inline-flex min-h-6 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-4',
        copy.badgeClassName,
        className,
      )}
    >
      {copy.badgeLabel}
    </span>
  )
}
