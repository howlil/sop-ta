import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { SetPageHeader } from '@/components/layout/PageHeaderProvider'
import { useWorkItems } from '@/features/work-items'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function WorkItemsPage() {
  useDocumentTitle('Pekerjaan Saya')
  const { data, isLoading, isError, refetch } = useWorkItems()
  const items = data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <SetPageHeader breadcrumb={[{ label: 'Pekerjaan Saya' }]} title="Pekerjaan Saya" />

      <section aria-labelledby="work-items-heading" className="overflow-hidden border-y border-row-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-row-border px-4 py-3 sm:px-5">
          <div>
            <h2 id="work-items-heading" className="text-ui-body font-semibold text-foreground">
              Perlu tindakan
            </h2>
            <p className="mt-0.5 text-ui-caption text-secondary-foreground">
              {isLoading ? 'Memeriksa workflow…' : `${items.length} pekerjaan aktif`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 px-4 py-10 text-ui-body text-secondary-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Memuat pekerjaan
          </div>
        ) : isError ? (
          <div className="px-4 py-10 text-center sm:px-5">
            <p className="text-ui-body font-medium text-foreground">Pekerjaan belum dapat dimuat.</p>
            <button
              type="button"
              className="mt-3 text-ui-body font-semibold text-primary hover:underline"
              onClick={() => void refetch()}
            >
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center sm:px-5">
            <CheckCircle2 className="h-7 w-7 text-secondary-foreground" aria-hidden />
            <p className="mt-3 text-ui-body font-semibold text-foreground">Tidak ada pekerjaan yang menunggu.</p>
            <p className="mt-1 max-w-md text-ui-caption text-secondary-foreground">
              Pekerjaan baru akan muncul ketika workflow membutuhkan tindakan dari peran Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-row-border">
            {items.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-ui-body font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-ui-caption text-secondary-foreground">{item.context}</p>
                </div>
                <a
                  href={item.actionHref}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border border-border px-3 text-ui-caption font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
