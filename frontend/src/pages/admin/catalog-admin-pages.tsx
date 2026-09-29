import { FileUp, FolderTree, Package, TicketPercent, UserRound } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/features/admin/form-values'
import { ResourcePage } from '@/features/admin/resource-page'
import { useCategoryOptions } from '@/features/admin/use-lookups'
import { publishStatusOptions, type AdminCategory, type AdminCoupon, type AdminInstructor, type AdminProduct } from '@/types/admin'
import { formatDate, formatPrice } from '@/utils/format'

const sar = (amount: number | null) => (amount === null ? '—' : formatPrice({ amount, currency: 'SAR' }))

function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'secondary'}>{active ? 'مفعّل' : 'معطّل'}</Badge>
}

function StatusBadge({ status }: { status: { value: string; label: string } }) {
  return <Badge variant={status.value === 'published' ? 'success' : status.value === 'draft' ? 'accent' : 'secondary'}>{status.label}</Badge>
}

// ---- Categories -------------------------------------------------------------

export function AdminCategoriesPage() {
  const categories = useCategoryOptions()
  const parents = categories.filter((c) => !c.label.startsWith('—'))

  const fields = (row: AdminCategory | null): FieldDef[] => [
    { name: 'name', label: 'الاسم', type: 'text', required: true },
    { name: 'slug', label: 'الرابط المختصر', type: 'text', dir: 'ltr', hint: 'يُولَّد تلقائياً من الاسم إذا تُرك فارغاً.' },
    {
      name: 'parent_id',
      label: 'التصنيف الأب',
      type: 'select',
      numeric: true,
      placeholder: 'بدون (تصنيف رئيسي)',
      options: parents.filter((p) => Number(p.value) !== row?.id),
    },
    { name: 'icon', label: 'الأيقونة', type: 'text', dir: 'ltr', hint: 'اسم أيقونة مثل calculator أو book-open.' },
    { name: 'description', label: 'الوصف', type: 'textarea', rows: 3 },
    { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
    { name: 'is_active', label: 'مفعّل', type: 'switch' },
    { name: 'seo_title', label: 'عنوان SEO', type: 'text' },
    { name: 'seo_description', label: 'وصف SEO', type: 'textarea', rows: 2 },
  ]

  return (
    <ResourcePage<AdminCategory>
      resource="categories"
      title="التصنيفات"
      description="تصنيفات الدورات والمنتجات (مستويان كحد أقصى)."
      singular="تصنيف"
      emptyIcon={FolderTree}
      fields={fields}
      canDelete={(c) => c.courses_count + c.products_count + c.children_count === 0}
      columns={[
        { header: 'الاسم', cell: (c) => <span className="font-medium">{c.parent_id ? `— ${c.name}` : c.name}</span> },
        { header: 'الرابط', cell: (c) => <span className="text-xs text-muted-foreground" dir="ltr">{c.slug}</span>, className: 'hidden md:table-cell' },
        { header: 'الدورات', cell: (c) => c.courses_count },
        { header: 'المنتجات', cell: (c) => c.products_count, className: 'hidden sm:table-cell' },
        { header: 'الحالة', cell: (c) => <ActiveBadge active={c.is_active} /> },
      ]}
    />
  )
}

// ---- Instructors ------------------------------------------------------------

export function AdminInstructorsPage() {
  return (
    <ResourcePage<AdminInstructor>
      resource="instructors"
      title="المدرّبون"
      description="ملفات المدرّبين المعروضة في الموقع. ربط الملف بحساب يمنحه صلاحية إدارة دوراته."
      singular="مدرّب"
      emptyIcon={UserRound}
      wide
      fields={[
        { name: 'name', label: 'الاسم', type: 'text', required: true },
        { name: 'headline', label: 'المسمى', type: 'text' },
        { name: 'user_id', label: 'رقم حساب المستخدم المرتبط', type: 'number', hint: 'اختياري: رقم الحساب من صفحة المستخدمين.' },
        { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
        { name: 'avatar_media_id', label: 'الصورة', type: 'image', previewKey: 'avatar_url' },
        { name: 'bio', label: 'نبذة', type: 'markdown', rows: 6 },
        { name: 'is_active', label: 'ظاهر في الموقع', type: 'switch' },
      ]}
      toSource={(i) => ({ ...i, user_id: i.user?.id ?? null })}
      columns={[
        { header: 'الاسم', cell: (i) => <span className="font-medium">{i.name}</span> },
        { header: 'الحساب', cell: (i) => (i.user ? <span dir="ltr" className="text-xs">{i.user.email}</span> : '—'), className: 'hidden md:table-cell' },
        { header: 'الدورات', cell: (i) => i.courses_count },
        { header: 'الحالة', cell: (i) => <ActiveBadge active={i.is_active} /> },
      ]}
    />
  )
}

// ---- Products ---------------------------------------------------------------

const productTypeOptions = [
  { value: 'ebook', label: 'كتاب إلكتروني' },
  { value: 'question_bank', label: 'بنك أسئلة' },
  { value: 'bundle', label: 'حزمة' },
  { value: 'other', label: 'أخرى' },
]

function ProductFileButton({ product }: { product: AdminProduct }) {
  const input = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".pdf,.zip,.epub"
        className="hidden"
        aria-label={`ملف ${product.title}`}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            await adminApi.uploadProductFile(product.id, file)
            toast.success('تم رفع الملف')
            void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('products') })
          } catch (err) {
            toast.error(ApiError.from(err).message)
          }
        }}
      />
      <Button variant="ghost" size="icon-sm" aria-label={`رفع ملف ${product.title}`} title="رفع ملف المنتج" onClick={() => input.current?.click()}>
        <FileUp />
      </Button>
    </>
  )
}

export function AdminProductsPage() {
  const categories = useCategoryOptions()

  return (
    <ResourcePage<AdminProduct>
      resource="products"
      title="المنتجات"
      description="الكتب الإلكترونية وبنوك الأسئلة والحزم."
      singular="منتج"
      emptyIcon={Package}
      wide
      filters={[
        { name: 'search', label: 'بحث', type: 'search', placeholder: 'ابحث بالعنوان' },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
        { name: 'type', label: 'النوع', type: 'select', options: productTypeOptions },
      ]}
      fields={[
        { name: 'title', label: 'العنوان', type: 'text', required: true },
        { name: 'type', label: 'النوع', type: 'select', options: productTypeOptions, required: true },
        { name: 'category_id', label: 'التصنيف', type: 'select', numeric: true, options: categories },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
        { name: 'price', label: 'السعر', type: 'money', min: 0, required: true },
        { name: 'compare_at_price', label: 'السعر قبل الخصم', type: 'money', min: 0 },
        { name: 'subtitle', label: 'وصف مختصر', type: 'text', wide: true },
        { name: 'cover_media_id', label: 'صورة الغلاف', type: 'image', previewKey: 'cover_url' },
        { name: 'description', label: 'الوصف', type: 'markdown' },
        { name: 'is_featured', label: 'مميّز في الصفحة الرئيسية', type: 'switch' },
        { name: 'published_at', label: 'تاريخ النشر', type: 'datetime' },
        { name: 'seo_title', label: 'عنوان SEO', type: 'text' },
        { name: 'seo_description', label: 'وصف SEO', type: 'text' },
      ]}
      toSource={(p) => ({ ...p, type: p.type.value, status: p.status.value })}
      rowActions={(p) => <ProductFileButton product={p} />}
      columns={[
        { header: 'العنوان', cell: (p) => <span className="font-medium">{p.title}</span> },
        { header: 'النوع', cell: (p) => p.type.label, className: 'hidden md:table-cell' },
        { header: 'السعر', cell: (p) => <span className="tabular-nums">{sar(p.price)}</span> },
        { header: 'الملف', cell: (p) => (p.has_file ? <Badge variant="success">مرفوع</Badge> : <Badge variant="secondary">لا يوجد</Badge>), className: 'hidden lg:table-cell' },
        { header: 'الحالة', cell: (p) => <StatusBadge status={p.status} /> },
      ]}
    />
  )
}

// ---- Coupons ----------------------------------------------------------------

export function AdminCouponsPage() {
  return (
    <ResourcePage<AdminCoupon>
      resource="coupons"
      title="رموز الخصم"
      description="الخصم بالنسبة أو بمبلغ ثابت، مع حدود الاستخدام والمدة."
      singular="رمز خصم"
      emptyIcon={TicketPercent}
      wide
      filters={[{ name: 'search', label: 'بحث', type: 'search', placeholder: 'ابحث بالرمز' }]}
      fields={[
        { name: 'code', label: 'الرمز', type: 'text', dir: 'ltr', required: true },
        {
          name: 'type',
          label: 'النوع',
          type: 'select',
          required: true,
          options: [
            { value: 'percent', label: 'نسبة مئوية' },
            { value: 'fixed', label: 'مبلغ ثابت (ر.س)' },
          ],
        },
        { name: 'value', label: 'القيمة', type: 'number', step: 0.01, min: 0, required: true, hint: 'نسبة من 1 إلى 100، أو مبلغ بالريال.' },
        {
          name: 'applies_to',
          label: 'ينطبق على',
          type: 'select',
          options: [
            { value: 'all', label: 'الكل' },
            { value: 'courses', label: 'الدورات' },
            { value: 'products', label: 'المنتجات' },
          ],
        },
        { name: 'max_discount', label: 'أقصى خصم', type: 'money', min: 0 },
        { name: 'min_subtotal', label: 'أدنى إجمالي للسلة', type: 'money', min: 0 },
        { name: 'starts_at', label: 'يبدأ في', type: 'datetime' },
        { name: 'expires_at', label: 'ينتهي في', type: 'datetime' },
        { name: 'usage_limit', label: 'حد الاستخدام الكلي', type: 'number', min: 1 },
        { name: 'usage_limit_per_user', label: 'حد الاستخدام لكل مستخدم', type: 'number', min: 1 },
        { name: 'description', label: 'ملاحظة داخلية', type: 'text', wide: true },
        { name: 'is_active', label: 'مفعّل', type: 'switch' },
      ]}
      columns={[
        { header: 'الرمز', cell: (c) => <span className="font-mono font-semibold" dir="ltr">{c.code}</span> },
        { header: 'الخصم', cell: (c) => (c.type === 'percent' ? `${c.value}%` : sar(c.value)) },
        {
          header: 'الاستخدام',
          cell: (c) => <span className="tabular-nums">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</span>,
        },
        { header: 'ينتهي', cell: (c) => (c.expires_at ? formatDate(c.expires_at) : '—'), className: 'hidden md:table-cell' },
        { header: 'الحالة', cell: (c) => <ActiveBadge active={c.is_active} /> },
      ]}
    />
  )
}
