import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { AddItemIconButton, EditableStringList } from '@/components/ui/editable-string-list'
import { FieldWithCornerRemoveButton } from '@/components/ui/field-with-corner-remove-button'
import { cn } from '@/utils/cn'
import { useSopEditor } from '../SopEditorContext'

function InspectorSection({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="border-b border-border py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function ReadOnlyTextBlock({
  value,
  placeholder,
  multiline = false,
}: {
  value: string
  placeholder: string
  multiline?: boolean
}) {
  const hasValue = value.trim().length > 0
  return (
    <div
      className={cn(
        'text-xs text-foreground',
        multiline ? 'whitespace-pre-wrap leading-relaxed' : 'min-h-5',
      )}
    >
      {hasValue ? value : <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  )
}

export interface SOPHeaderSectionProps {
  onOpenLawBasisDialog: () => void
  onOpenRelatedPosDialog: () => void
  onOpenPelaksanaDialog?: () => void
}

/** Inspector metadata header SOP over the canonical editor model. */
export function SOPHeaderSection({
  onOpenLawBasisDialog,
  onOpenRelatedPosDialog,
  onOpenPelaksanaDialog,
}: SOPHeaderSectionProps) {
  const { metadata, handleMetadataChange, implementers, setImplementers, isReadOnly } =
    useSopEditor()

  const institutionText = metadata.namaLembaga ?? ''
  const sopName = metadata.judul ?? ''
  const sopNumber = metadata.nomorSOP ?? ''

  return (
    <div>
      <InspectorSection title="Identitas lembaga">
        {isReadOnly ? (
          <ReadOnlyTextBlock value={institutionText} placeholder="Belum diisi." multiline />
        ) : (
          <Textarea
            className="min-h-[84px] text-xs"
            value={institutionText}
            onChange={(event) => handleMetadataChange('namaLembaga', event.target.value)}
            placeholder="Baris 1&#10;Baris 2&#10;Baris 3&#10;Baris 4"
          />
        )}
      </InspectorSection>

      <InspectorSection title="Identitas SOP">
        <FormField label={<span className="font-medium text-foreground">Nama SOP</span>}>
          {isReadOnly ? (
            <ReadOnlyTextBlock value={sopName} placeholder="Belum ada nama SOP." />
          ) : (
            <AutoResizeTextarea
              className="min-h-9 py-1.5 text-xs"
              minRows={1}
              maxRows={8}
              value={sopName}
              onChange={(event) => handleMetadataChange('judul', event.target.value)}
              placeholder="Judul SOP"
            />
          )}
        </FormField>
        <FormField label={<span className="font-medium text-foreground">Nomor SOP</span>}>
          {isReadOnly ? (
            <ReadOnlyTextBlock value={sopNumber} placeholder="Belum ada nomor SOP." />
          ) : (
            <Input
              className="h-9 text-xs"
              value={sopNumber}
              onChange={(event) => handleMetadataChange('nomorSOP', event.target.value)}
              placeholder="Mis. 001/SOP/2026"
            />
          )}
        </FormField>
      </InspectorSection>

      <InspectorSection
        title="Dasar hukum"
        action={
          !isReadOnly ? (
            <AddItemIconButton onClick={onOpenLawBasisDialog} label="Tambah dasar hukum" />
          ) : undefined
        }
      >
        <div className="space-y-1">
          {(metadata.dasarHukum ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada dasar hukum.</p>
          ) : (
            (metadata.dasarHukum ?? []).map((item, idx) =>
              !isReadOnly ? (
                <FieldWithCornerRemoveButton
                  key={`${idx}-${item}`}
                  className="rounded-md border border-border bg-surface"
                  contentClassName="px-2.5 py-2 pr-8 text-xs text-secondary-foreground"
                  onRemove={() => {
                    const nextLabels = (metadata.dasarHukum ?? []).filter((_, i) => i !== idx)
                    const nextIds = (metadata.dasarHukumPeraturanIds ?? []).filter((_, i) => i !== idx)
                    handleMetadataChange('dasarHukum', nextLabels)
                    handleMetadataChange('dasarHukumPeraturanIds', nextIds)
                  }}
                >
                  {item}
                </FieldWithCornerRemoveButton>
              ) : (
                <p key={`${idx}-${item}`} className="text-xs leading-relaxed text-secondary-foreground">
                  {item}
                </p>
              ),
            )
          )}
        </div>
      </InspectorSection>

      <InspectorSection
        title="Keterkaitan dengan SOP"
        action={
          !isReadOnly ? (
            <AddItemIconButton onClick={onOpenRelatedPosDialog} label="Tambah keterkaitan SOP" />
          ) : undefined
        }
      >
        <div className="space-y-1">
          {(metadata.sopTerkait ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada keterkaitan SOP.</p>
          ) : (
            (metadata.sopTerkait ?? []).map((item, idx) =>
              !isReadOnly ? (
                <FieldWithCornerRemoveButton
                  key={`${idx}-${item}`}
                  className="rounded-md border border-border bg-surface"
                  contentClassName="px-2.5 py-2 pr-8 text-xs text-secondary-foreground"
                  onRemove={() => {
                    const nextLabels = (metadata.sopTerkait ?? []).filter((_, i) => i !== idx)
                    const nextIds = (metadata.sopTerkaitDetailIds ?? []).filter((_, i) => i !== idx)
                    handleMetadataChange('sopTerkait', nextLabels)
                    handleMetadataChange('sopTerkaitDetailIds', nextIds)
                  }}
                >
                  {item}
                </FieldWithCornerRemoveButton>
              ) : (
                <p key={`${idx}-${item}`} className="text-xs leading-relaxed text-secondary-foreground">
                  {item}
                </p>
              ),
            )
          )}
        </div>
      </InspectorSection>

      <InspectorSection
        title="Peringatan"
        action={
          !isReadOnly ? (
            <AddItemIconButton
              onClick={() => handleMetadataChange('peringatan', [...(metadata.peringatan ?? []), ''])}
              label="Tambah peringatan"
            />
          ) : undefined
        }
      >
        {isReadOnly ? (
          <ul className="list-disc space-y-1 pl-4">
            {(metadata.peringatan ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">Tidak ada peringatan.</li>
            ) : (
              (metadata.peringatan ?? []).map((line, idx) => (
                <li key={`${idx}-${line}`} className="text-xs text-secondary-foreground">
                  {line}
                </li>
              ))
            )}
          </ul>
        ) : (
          <EditableStringList
            items={metadata.peringatan ?? []}
            onChange={(next) => handleMetadataChange('peringatan', next)}
            placeholder="Peringatan"
            emptyMessage="Belum ada peringatan."
            showAddButton={false}
          />
        )}
      </InspectorSection>

      <InspectorSection
        title="Kualifikasi pelaksanaan"
        action={
          !isReadOnly ? (
            <AddItemIconButton
              onClick={() =>
                handleMetadataChange('kualifikasiPelaksanaan', [
                  ...(metadata.kualifikasiPelaksanaan ?? []),
                  '',
                ])
              }
              label="Tambah kualifikasi"
            />
          ) : undefined
        }
      >
        {isReadOnly ? (
          <ul className="list-disc space-y-1 pl-4">
            {(metadata.kualifikasiPelaksanaan ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">Belum ada kualifikasi.</li>
            ) : (
              (metadata.kualifikasiPelaksanaan ?? []).map((line, idx) => (
                <li key={`${idx}-${line}`} className="text-xs text-secondary-foreground">
                  {line}
                </li>
              ))
            )}
          </ul>
        ) : (
          <EditableStringList
            items={metadata.kualifikasiPelaksanaan ?? []}
            onChange={(next) => handleMetadataChange('kualifikasiPelaksanaan', next)}
            placeholder="Kualifikasi"
            emptyMessage="Belum ada kualifikasi."
            showAddButton={false}
          />
        )}
      </InspectorSection>

      <InspectorSection
        title="Peralatan dan perlengkapan"
        action={
          !isReadOnly ? (
            <AddItemIconButton
              onClick={() =>
                handleMetadataChange('peralatanPerlengkapan', [
                  ...(metadata.peralatanPerlengkapan ?? []),
                  '',
                ])
              }
              label="Tambah peralatan"
            />
          ) : undefined
        }
      >
        {isReadOnly ? (
          <ul className="list-disc space-y-1 pl-4">
            {(metadata.peralatanPerlengkapan ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">Belum ada peralatan/perlengkapan.</li>
            ) : (
              (metadata.peralatanPerlengkapan ?? []).map((line, idx) => (
                <li key={`${idx}-${line}`} className="text-xs text-secondary-foreground">
                  {line}
                </li>
              ))
            )}
          </ul>
        ) : (
          <EditableStringList
            items={metadata.peralatanPerlengkapan ?? []}
            onChange={(next) => handleMetadataChange('peralatanPerlengkapan', next)}
            placeholder="Peralatan"
            emptyMessage="Belum ada peralatan/perlengkapan."
            showAddButton={false}
          />
        )}
      </InspectorSection>

      <InspectorSection
        title="Pencatatan dan pendataan"
        action={
          !isReadOnly ? (
            <AddItemIconButton
              onClick={() =>
                handleMetadataChange('pencatatanPendataan', [
                  ...(metadata.pencatatanPendataan ?? []),
                  '',
                ])
              }
              label="Tambah pencatatan"
            />
          ) : undefined
        }
      >
        {isReadOnly ? (
          <ul className="list-disc space-y-1 pl-4">
            {(metadata.pencatatanPendataan ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">Belum ada pencatatan/pendataan.</li>
            ) : (
              (metadata.pencatatanPendataan ?? []).map((line, idx) => (
                <li key={`${idx}-${line}`} className="text-xs text-secondary-foreground">
                  {line}
                </li>
              ))
            )}
          </ul>
        ) : (
          <EditableStringList
            items={metadata.pencatatanPendataan ?? []}
            onChange={(next) => handleMetadataChange('pencatatanPendataan', next)}
            placeholder="Pencatatan"
            emptyMessage="Belum ada pencatatan/pendataan."
            showAddButton={false}
          />
        )}
      </InspectorSection>

      <InspectorSection
        title="Aktor pelaksana"
        action={
          !isReadOnly && onOpenPelaksanaDialog ? (
            <AddItemIconButton onClick={onOpenPelaksanaDialog} label="Tambah aktor pelaksana" />
          ) : undefined
        }
      >
        <div className="space-y-1">
          {implementers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada aktor pelaksana.</p>
          ) : (
            implementers.map((implementer, idx) =>
              !isReadOnly ? (
                <FieldWithCornerRemoveButton
                  key={implementer.id}
                  className="rounded-md border border-border bg-surface"
                  contentClassName="px-2.5 py-2 pr-8 text-xs text-secondary-foreground"
                  onRemove={() => setImplementers((prev) => prev.filter((_, i) => i !== idx))}
                >
                  {implementer.name}
                </FieldWithCornerRemoveButton>
              ) : (
                <p key={implementer.id} className="text-xs text-secondary-foreground">
                  {implementer.name}
                </p>
              ),
            )
          )}
        </div>
      </InspectorSection>

      {isReadOnly ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>Mode lihat aktif. Metadata SOP hanya dapat dibaca pada versi ini.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
