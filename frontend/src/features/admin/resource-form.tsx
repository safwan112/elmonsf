import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, type Control, type UseFormRegister } from 'react-hook-form'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { ApiError } from '@/api/errors'
import { FormField } from '@/components/forms/form-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AdminQuestionOption } from '@/types/admin'
import { initialValues, serialize, type FieldDef, type FormValues } from './form-values'

interface ResourceFormProps {
  fields: FieldDef[]
  source?: Record<string, unknown>
  submitLabel?: string
  onSubmit: (body: Record<string, unknown>) => Promise<unknown>
  onCancel?: () => void
}

/**
 * Config-driven admin form. Server-side validation errors (422) are mapped
 * back onto the matching fields; anything else is shown above the buttons.
 */
export function ResourceForm({ fields, source, submitLabel = 'حفظ', onSubmit, onCancel }: ResourceFormProps) {
  const form = useForm<FormValues>({ defaultValues: initialValues(fields, source) })
  const [formError, setFormError] = useState<string | null>(null)
  const names = new Set(fields.map((f) => f.name))

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(serialize(fields, values))
    } catch (err) {
      const error = ApiError.from(err)
      let mapped = false
      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const name = key.split('.')[0]!
        if (names.has(name)) {
          form.setError(name, { message: messages[0] })
          mapped = true
        }
      }
      if (!mapped) setFormError(error.message)
    }
  })

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={cn(field.wide || isWideType(field) ? 'sm:col-span-2' : undefined)}>
            <FieldControl field={field} register={form.register} control={form.control} error={form.formState.errors[field.name]?.message} />
          </div>
        ))}
      </div>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function isWideType(field: FieldDef): boolean {
  return field.type === 'textarea' || field.type === 'markdown' || field.type === 'lines' || field.type === 'options' || field.type === 'image'
}

function FieldControl({
  field,
  register,
  control,
  error,
}: {
  field: FieldDef
  register: UseFormRegister<FormValues>
  control: Control<FormValues>
  error?: string
}) {
  const label = field.required ? `${field.label} *` : field.label
  const rules = field.required ? { required: 'هذا الحقل مطلوب' } : undefined

  switch (field.type) {
    case 'switch':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: f }) => (
            <div className="flex items-center gap-2.5 pt-7">
              <Checkbox id={`f-${field.name}`} checked={Boolean(f.value)} onCheckedChange={(v) => f.onChange(v === true)} />
              <Label htmlFor={`f-${field.name}`} className="font-normal">
                {field.label}
              </Label>
            </div>
          )}
        />
      )
    case 'select':
      return (
        <FormField label={label} error={error} hint={field.hint}>
          <NativeSelect {...register(field.name, rules)}>
            <option value="">{field.placeholder ?? '—'}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )
    case 'textarea':
    case 'markdown':
    case 'lines':
      return (
        <FormField
          label={label}
          error={error}
          hint={field.hint ?? (field.type === 'markdown' ? 'يدعم تنسيق Markdown: العناوين (##) والقوائم (-) والخط العريض (**نص**).' : field.type === 'lines' ? 'عنصر في كل سطر.' : undefined)}
        >
          <Textarea rows={field.rows ?? (field.type === 'markdown' ? 10 : 4)} {...register(field.name, rules)} />
        </FormField>
      )
    case 'number':
    case 'money':
      return (
        <FormField label={field.type === 'money' ? `${label} (ر.س)` : label} error={error} hint={field.hint}>
          <Input
            type="number"
            inputMode="decimal"
            dir="ltr"
            min={field.min}
            max={field.max}
            step={field.step ?? (field.type === 'money' ? 0.01 : 1)}
            {...register(field.name, rules)}
          />
        </FormField>
      )
    case 'datetime':
      return (
        <FormField label={label} error={error} hint={field.hint}>
          <Input type="datetime-local" dir="ltr" {...register(field.name, rules)} />
        </FormField>
      )
    case 'tags':
      return (
        <FormField label={label} error={error} hint={field.hint ?? 'افصل بين الوسوم بفاصلة.'}>
          <Input {...register(field.name, rules)} />
        </FormField>
      )
    case 'image':
      return <ImageField field={field} control={control} label={label} error={error} />
    case 'options':
      return <OptionsField name={field.name} control={control} label={label} error={error} />
    default:
      return (
        <FormField label={label} error={error} hint={field.hint}>
          <Input
            type={field.type}
            dir={field.dir ?? (field.type === 'email' || field.type === 'url' ? 'ltr' : undefined)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            {...register(field.name, rules)}
          />
        </FormField>
      )
  }
}

function ImageField({ field, control, label, error }: { field: FieldDef; control: Control<FormValues>; label: string; error?: string }) {
  const [uploading, setUploading] = useState(false)

  return (
    <Controller
      name={`${field.name}__preview`}
      control={control}
      render={({ field: preview }) => (
        <Controller
          name={field.name}
          control={control}
          render={({ field: media }) => (
            <FormField label={label} error={error} hint="JPG أو PNG أو WebP حتى 5 ميجابايت.">
              {(props) => (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {typeof preview.value === 'string' && preview.value ? (
                      <img src={preview.value} alt="" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Input
                      {...props}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      className="max-w-64"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploading(true)
                        try {
                          const asset = await adminApi.uploadMedia(file)
                          media.onChange(asset.id)
                          preview.onChange(asset.url)
                        } catch (err) {
                          toast.error(ApiError.from(err).message)
                        } finally {
                          setUploading(false)
                        }
                      }}
                    />
                    {typeof preview.value === 'string' && preview.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start text-destructive"
                        onClick={() => {
                          media.onChange(null)
                          preview.onChange(null)
                        }}
                      >
                        إزالة الصورة
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </FormField>
          )}
        />
      )}
    />
  )
}

function OptionsField({ name, control, label, error }: { name: string; control: Control<FormValues>; label: string; error?: string }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const options = (field.value as AdminQuestionOption[]) ?? []
        const update = (next: AdminQuestionOption[]) => field.onChange(next)
        return (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{label}</legend>
            <p className="text-xs text-muted-foreground">حدّد الإجابة الصحيحة بالدائرة بجانبها.</p>
            {options.map((option, i) => (
              <div key={option.id ?? `new-${i}`} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${name}-correct`}
                  aria-label={`الخيار ${i + 1} هو الإجابة الصحيحة`}
                  checked={option.is_correct}
                  onChange={() => update(options.map((o, j) => ({ ...o, is_correct: j === i })))}
                  className="size-4 accent-[var(--primary)]"
                />
                <Input
                  aria-label={`نص الخيار ${i + 1}`}
                  value={option.body}
                  onChange={(e) => update(options.map((o, j) => (j === i ? { ...o, body: e.target.value } : o)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`حذف الخيار ${i + 1}`}
                  disabled={options.length <= 2}
                  onClick={() => update(options.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {options.length < 6 && (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => update([...options, { body: '', is_correct: false }])}>
                <Plus />
                إضافة خيار
              </Button>
            )}
            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </fieldset>
        )
      }}
    />
  )
}
