import { FormDialog } from '@/shared/ui/form-dialog'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'

export interface SingleTextFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  onConfirm: () => void
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function SingleTextFieldDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  value,
  onValueChange,
  onConfirm,
  placeholder,
  confirmLabel = 'Simpan',
  cancelLabel = 'Batal',
  confirmDisabled,
  required = true,
  size = 'md',
}: SingleTextFieldDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      confirmDisabled={confirmDisabled}
      size={size}
    >
      <FormField label={label} required={required}>
        <Input
          className="h-9 text-xs"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      </FormField>
    </FormDialog>
  )
}
