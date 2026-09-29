import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FieldDef } from '@/features/admin/form-values'
import { ResourceForm } from '@/features/admin/resource-form'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DashboardSection } from '@/layouts/dashboard-shell'
import type { AdminSettings } from '@/types/admin'
import { formatDateTime } from '@/utils/format'

const SOCIAL = ['x', 'instagram', 'tiktok', 'youtube', 'telegram', 'snapchat'] as const

const generalFields: FieldDef[] = [
  { name: 'site_name', label: 'اسم المنصة', type: 'text' },
  { name: 'tagline', label: 'الشعار النصي', type: 'text' },
  { name: 'announcement', label: 'شريط الإعلان', type: 'text', wide: true, hint: 'يظهر أعلى الموقع. اتركه فارغاً لإخفائه.' },
  { name: 'contact_email', label: 'بريد التواصل', type: 'email' },
  { name: 'contact_phone', label: 'هاتف التواصل', type: 'text', dir: 'ltr' },
  { name: 'whatsapp', label: 'واتساب', type: 'text', dir: 'ltr', hint: 'بالصيغة الدولية مثل ‎+966500000000' },
  { name: 'working_hours', label: 'ساعات العمل', type: 'text' },
  ...SOCIAL.map((key): FieldDef => ({ name: `social_${key}`, label: `رابط ${key}`, type: 'url', placeholder: 'https://' })),
]

const invoiceFields: FieldDef[] = [
  { name: 'legal_name', label: 'الاسم القانوني', type: 'text' },
  { name: 'vat_number', label: 'الرقم الضريبي', type: 'text', dir: 'ltr', hint: '15 رقماً.' },
  { name: 'address', label: 'العنوان', type: 'textarea', rows: 2 },
]

export function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: queryKeys.admin.settings, queryFn: adminApi.settings })

  if (settings.isPending) return <PageLoader />
  if (settings.isError) {
    return (
      <DashboardSection>
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      </DashboardSection>
    )
  }

  const source: Record<string, unknown> = { ...settings.data }
  for (const key of SOCIAL) source[`social_${key}`] = settings.data.social?.[key] ?? null

  const save = async (body: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {}
    const social: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('social_')) social[key.slice(7)] = value
      else payload[key] = value
    }
    if (Object.keys(social).length > 0) payload.social = social
    const res = await adminApi.updateSettings(payload as Partial<AdminSettings>)
    queryClient.setQueryData(queryKeys.admin.settings, res.data)
    void queryClient.invalidateQueries({ queryKey: queryKeys.content.settings })
    toast.success(res.message ?? 'تم الحفظ')
  }

  return (
    <DashboardSection className="max-w-4xl">
      <Seo title="الإعدادات" noIndex />
      <PageHeader title="الإعدادات" description="بيانات المنصة العامة وبيانات الفواتير." />
      <Card>
        <CardHeader>
          <CardTitle>البيانات العامة</CardTitle>
          <CardDescription>تظهر في الموقع (التذييل وصفحة التواصل).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm fields={generalFields} source={source} submitLabel="حفظ البيانات العامة" onSubmit={save} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>بيانات الفواتير</CardTitle>
          <CardDescription>تظهر على الفواتير الضريبية المبسّطة فقط.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm fields={invoiceFields} source={source} submitLabel="حفظ بيانات الفواتير" onSubmit={save} />
        </CardContent>
      </Card>
    </DashboardSection>
  )
}

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const [actionInput, setActionInput] = useState('')
  const action = useDebouncedValue(actionInput.trim())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const params = { page, action: /^[a-z_.]+$/.test(action) ? action : undefined, from: from || undefined, to: to || undefined }

  const logs = useQuery({
    queryKey: queryKeys.admin.resource('audit-logs', params),
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: keepPreviousData,
  })

  return (
    <DashboardSection>
      <Seo title="سجل التدقيق" noIndex />
      <PageHeader title="سجل التدقيق" description="كل الإجراءات الحساسة: الدخول وتغييرات الحسابات والمحتوى والطلبات." />
      <Card className="gap-0 py-0">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-3">
          <Input
            aria-label="تصفية حسب الإجراء"
            placeholder="الإجراء، مثل course أو auth.login"
            dir="ltr"
            value={actionInput}
            onChange={(e) => {
              setActionInput(e.target.value)
              setPage(1)
            }}
          />
          <Input type="date" aria-label="من تاريخ" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="إلى تاريخ" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {logs.isError ? (
          <div className="p-4">
            <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
          </div>
        ) : logs.isPending ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : logs.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ScrollText} title="لا توجد سجلات مطابقة" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>المنفّذ</TableHead>
                    <TableHead className="hidden md:table-cell">العنصر</TableHead>
                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                    <TableHead>الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.data.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <details>
                          <summary className="cursor-pointer">
                            <Badge variant="secondary" dir="ltr">
                              {log.action}
                            </Badge>
                          </summary>
                          {log.metadata && (
                            <pre dir="ltr" className="mt-2 max-w-md overflow-x-auto rounded-md bg-muted p-2 text-start text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </details>
                      </TableCell>
                      <TableCell>{log.actor?.name ?? 'النظام'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.subject_type ? (
                          <span dir="ltr" className="text-xs">
                            {log.subject_type} #{log.subject_id}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" dir="ltr">
                        {log.ip_address ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t p-4">
              <Pagination meta={logs.data.meta} disabled={logs.isFetching} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </DashboardSection>
  )
}
