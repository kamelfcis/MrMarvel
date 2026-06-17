import { useRef, useState } from 'react'
import {
  Calendar,
  Target,
  Download,
  FileDown,
  Receipt,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ARABIC_MONTHS,
  buildSalaryWhatsAppMessage,
  buildTargetWhatsAppMessage,
  downloadSampleSalaryWorkbook,
  exportSalaryWorkbook,
  formatSalaryPeriodSubtitle,
  getCurrentSalaryPeriod,
  openWhatsApp,
  parseSalaryWorkbook,
  type EmployeeSalary,
  type EmployeeTarget,
  type SalaryPeriod,
} from '../lib/salary'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => getCurrentSalaryPeriod().year - 2 + i)

export default function SalaryDashboard() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [employees, setEmployees] = useState<EmployeeSalary[]>([])
  const [targets, setTargets] = useState<EmployeeTarget[]>([])
  const [uploading, setUploading] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendAllRemaining, setSendAllRemaining] = useState(0)
  const [period, setPeriod] = useState<SalaryPeriod>(getCurrentSalaryPeriod)
  const [periodManuallySet, setPeriodManuallySet] = useState(false)

  const updatePeriod = (next: Partial<SalaryPeriod>) => {
    setPeriod((current) => ({ ...current, ...next }))
    setPeriodManuallySet(true)
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('الرجاء اختيار ملف Excel أولاً')
      return
    }

    setUploading(true)
    try {
      const data = await parseSalaryWorkbook(file)
      setEmployees(data.employees)
      setTargets(data.targets)

      if (data.detectedPeriod) {
        if (periodManuallySet) {
          const selectedLabel = formatSalaryPeriodSubtitle(period).split(' - ')[0]
          const detectedLabel = formatSalaryPeriodSubtitle(data.detectedPeriod).split(' - ')[0]
          if (
            data.detectedPeriod.month !== period.month ||
            data.detectedPeriod.year !== period.year
          ) {
            toast.success(
              `تم تحميل الملف — الملف يشير إلى ${detectedLabel}، وتم استخدام ${selectedLabel} حسب اختيارك`
            )
            return
          }
        } else {
          setPeriod(data.detectedPeriod)
          toast.success(
            `تم تحميل الملف — الفترة: ${formatSalaryPeriodSubtitle(data.detectedPeriod).split(' - ')[0]}`
          )
          return
        }
      }

      toast.success('تم تحميل الملف بنجاح')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء معالجة الملف')
    } finally {
      setUploading(false)
    }
  }

  const handleSendAll = async () => {
    if (employees.length === 0) {
      toast.error('لا توجد بيانات موظفين للإرسال')
      return
    }

    setSendingAll(true)
    setSendAllRemaining(employees.length)

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      if (emp.phone) {
        openWhatsApp(
          emp.phone,
          buildSalaryWhatsAppMessage(
            emp.name,
            emp.salary,
            emp.extra,
            emp.bonuses,
            emp.absence,
            emp.absenceValue,
            emp.advances,
            emp.netSalary,
            period
          )
        )
      }
      setSendAllRemaining(employees.length - i - 1)
      await new Promise((r) => setTimeout(r, 2000))
    }

    setSendingAll(false)
    toast.success(`تم إرسال ${employees.length} رسالة بنجاح`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8" dir="rtl">
      <header className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-6 text-white shadow-lg">
        <h1 className="text-4xl font-bold">نظام إدارة المرتبات</h1>
        <p className="mt-2 text-blue-100">{formatSalaryPeriodSubtitle(period)}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5 text-blue-500" />
            رفع ملف المرتبات
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-900">
              <Calendar className="h-4 w-4" />
              فترة التقرير
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary-month">الشهر</Label>
                <Select
                  value={String(period.month)}
                  onValueChange={(value) => updatePeriod({ month: Number(value) })}
                >
                  <SelectTrigger id="salary-month">
                    <SelectValue placeholder="اختر الشهر" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARABIC_MONTHS.map((monthName, index) => (
                      <SelectItem key={monthName} value={String(index + 1)}>
                        {monthName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary-year">السنة</Label>
                <Select
                  value={String(period.year)}
                  onValueChange={(value) => updatePeriod({ year: Number(value) })}
                >
                  <SelectTrigger id="salary-year">
                    <SelectValue placeholder="اختر السنة" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-700/80">
              اختر الشهر والسنة قبل الرفع. إذا احتوى الملف على تاريخ، يُطبَّق تلقائياً ما لم تُغيّر
              الفترة يدوياً.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            <Button onClick={handleUpload} disabled={uploading} className="rounded-full px-6">
              <Upload className="h-4 w-4" />
              {uploading ? 'جاري التحميل...' : 'رفع الملف'}
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-fit rounded-full px-6"
            onClick={downloadSampleSalaryWorkbook}
          >
            <FileDown className="h-4 w-4" />
            تحميل نموذج Excel
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button
          variant="success"
          className="rounded-full px-6"
          onClick={handleSendAll}
          disabled={sendingAll || employees.length === 0}
        >
          إرسال الكل عبر واتساب
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">
            {sendingAll ? sendAllRemaining : employees.length}
          </span>
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-6"
          onClick={() => exportSalaryWorkbook(employees, targets, period)}
          disabled={employees.length === 0}
        >
          <Download className="h-4 w-4" />
          تصدير كملف Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Receipt className="h-5 w-5 text-green-500" />
            تفاصيل المرتبات
          </CardTitle>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            {employees.length} موظف
          </span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                {[
                  'اسم الموظف',
                  'الفرع',
                  'الوظيفة',
                  'المرتب الأساسي',
                  'الإضافي',
                  'المكافآت',
                  'الغياب',
                  'السلف',
                  'الصافي',
                  'إرسال',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-medium uppercase text-blue-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    سيتم عرض البيانات بعد رفع ملف Excel
                  </td>
                </tr>
              ) : (
                employees.map((emp, index) => (
                  <tr key={emp.name + index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium">{emp.name}</td>
                    <td className="px-4 py-3 text-sm">{emp.branch}</td>
                    <td className="px-4 py-3 text-sm">{emp.position}</td>
                    <td className="px-4 py-3 text-sm">{Math.round(emp.salary)} ج.م.</td>
                    <td className="px-4 py-3 text-sm">{Math.round(emp.extra)} ج.م.</td>
                    <td className="px-4 py-3 text-sm">{Math.round(emp.bonuses)} ج.م.</td>
                    <td className="px-4 py-3 text-sm">
                      {emp.absence} يوم ({Math.round(emp.absenceValue)} ج.م.)
                    </td>
                    <td className="px-4 py-3 text-sm">{Math.round(emp.advances)} ج.م.</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {Math.round(emp.netSalary)} ج.م.
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-green-500 transition hover:scale-110 hover:text-green-700"
                        onClick={() => {
                          if (!emp.phone) {
                            toast.error(`لا يوجد رقم هاتف لـ ${emp.name}`)
                            return
                          }
                          openWhatsApp(
                            emp.phone,
                            buildSalaryWhatsAppMessage(
                              emp.name,
                              emp.salary,
                              emp.extra,
                              emp.bonuses,
                              emp.absence,
                              emp.absenceValue,
                              emp.advances,
                              emp.netSalary,
                              period
                            )
                          )
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-red-500" />
            تقرير تحقيق الأهداف
          </CardTitle>
          <span className="text-sm text-gray-500">{targets.length} هدف</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                {[
                  'اسم الموظف',
                  'الفرع',
                  'المبيعات المطلوبة',
                  'المبيعات الفعلية',
                  'النسبة',
                  'قيمة الهدف',
                  'مكافأة إضافية',
                  'إرسال',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-medium uppercase text-blue-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    سيتم عرض البيانات بعد رفع ملف Excel
                  </td>
                </tr>
              ) : (
                targets.map((target, index) => (
                  <tr key={target.name + index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium">{target.name}</td>
                    <td className="px-4 py-3 text-sm">{target.branch}</td>
                    <td className="px-4 py-3 text-sm">{Math.round(target.requiredSales)} ج.م.</td>
                    <td className="px-4 py-3 text-sm">{Math.round(target.actualSales)} ج.م.</td>
                    <td
                      className={`px-4 py-3 text-sm font-bold ${target.ratio >= 1 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {target.ratio}
                    </td>
                    <td className="px-4 py-3 text-sm">{Math.round(target.targetValue)} ج.م.</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {Math.round(target.extraBonus)} ج.م.
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-green-500 transition hover:scale-110 hover:text-green-700"
                        onClick={() => {
                          if (!target.phone) {
                            toast.error(`لا يوجد رقم هاتف لـ ${target.name}`)
                            return
                          }
                          openWhatsApp(
                            target.phone,
                            buildTargetWhatsAppMessage(
                              target.name,
                              target.requiredSales,
                              target.actualSales,
                              target.ratio,
                              target.targetValue,
                              target.extraBonus,
                              period
                            )
                          )
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
