import * as XLSX from 'xlsx'

export interface EmployeeSalary {
  name: string
  branch: string
  position: string
  salary: number
  extra: number
  bonuses: number
  absence: number
  absenceValue: number
  advances: number
  netSalary: number
  phone: string
}

export interface EmployeeTarget {
  name: string
  branch: string
  requiredSales: number
  actualSales: number
  ratio: number
  targetValue: number
  extraBonus: number
  phone: string
}

export function processSalaryData(data: unknown[][]): EmployeeSalary[] {
  const processed: EmployeeSalary[] = []
  for (let i = 5; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 15) continue
    processed.push({
      name: String(row[2] || ''),
      branch: String(row[1] || ''),
      position: String(row[5] || ''),
      salary: Number(row[6]) || 0,
      extra: Number(row[7]) || 0,
      bonuses: Number(row[8]) || 0,
      absence: Math.abs(Number(row[10]) || 0),
      absenceValue: Number(row[11]) || 0,
      advances: Number(row[9]) || 0,
      netSalary: Number(row[14]) || 0,
      phone: String(row[4] || ''),
    })
  }
  return processed
}

export function processTargetData(data: unknown[][]): EmployeeTarget[] {
  const processed: EmployeeTarget[] = []
  for (let i = 6; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 9) continue

    const parseCurrency = (val: unknown) => {
      if (!val) return 0
      return parseFloat(String(val).replace(' ج.م.‏', '').replace(/,/g, '')) || 0
    }

    processed.push({
      name: String(row[1] || ''),
      branch: String(row[0] || ''),
      requiredSales: parseCurrency(row[4]),
      actualSales: parseCurrency(row[5]),
      ratio: Number(row[6]) || 0,
      targetValue: parseCurrency(row[7]),
      extraBonus: Number(row[8]) || 0,
      phone: String(row[3] || ''),
    })
  }
  return processed
}

export async function parseSalaryWorkbook(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })

  const salarySheet = workbook.Sheets['مرتب شهر ']
  const targetSheet = workbook.Sheets['تارجت الشهر']

  if (!salarySheet || !targetSheet) {
    throw new Error('الملف لا يحتوي على الأوراق المطلوبة (مرتب شهر / تارجت الشهر)')
  }

  const salaryData = XLSX.utils.sheet_to_json(salarySheet, { header: 1 }) as unknown[][]
  const targetData = XLSX.utils.sheet_to_json(targetSheet, { header: 1 }) as unknown[][]

  return {
    employees: processSalaryData(salaryData),
    targets: processTargetData(targetData),
  }
}

export function downloadSampleSalaryWorkbook() {
  const salarySheetData: unknown[][] = [
    ['تقرير المرتبات - نموذج'],
    [],
    [],
    [],
    [
      '',
      'الفرع',
      'اسم الموظف',
      '',
      'الهاتف',
      'الوظيفة',
      'المرتب الأساسي',
      'الإضافي',
      'المكافآت',
      'السلف',
      'الغياب (أيام)',
      'قيمة الغياب',
      '',
      '',
      'الصافي',
    ],
    [
      1,
      'فرع القاهرة',
      'أحمد محمد',
      '',
      '201234567890',
      'مندوب مبيعات',
      5000,
      500,
      200,
      0,
      0,
      0,
      '',
      '',
      5700,
    ],
  ]

  const targetSheetData: unknown[][] = [
    ['تقرير تحقيق التارجت - نموذج'],
    [],
    [],
    [],
    [],
    [
      'الفرع',
      'اسم الموظف',
      '',
      'الهاتف',
      'المبيعات المطلوبة',
      'المبيعات الفعلية',
      'النسبة',
      'قيمة الهدف',
      'مكافأة إضافية',
    ],
    [
      'فرع القاهرة',
      'أحمد محمد',
      '',
      '201234567890',
      '50000 ج.م.‏',
      '55000 ج.م.‏',
      1.1,
      '500 ج.م.‏',
      100,
    ],
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(salarySheetData),
    'مرتب شهر '
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(targetSheetData),
    'تارجت الشهر'
  )
  XLSX.writeFile(wb, 'نموذج_المرتبات.xlsx')
}

export function exportSalaryWorkbook(
  employees: EmployeeSalary[],
  targets: EmployeeTarget[]
) {
  const salaryHeaders = [
    'اسم الموظف',
    'الفرع',
    'الوظيفة',
    'المرتب الأساسي',
    'الإضافي',
    'المكافآت',
    'الغياب',
    'السلف',
    'الصافي',
  ]

  const salaryRows = employees.map((emp) => [
    emp.name,
    emp.branch,
    emp.position,
    Math.round(emp.salary),
    Math.round(emp.extra),
    Math.round(emp.bonuses),
    `${emp.absence} يوم`,
    Math.round(emp.advances),
    Math.round(emp.netSalary),
  ])

  const targetHeaders = [
    'اسم الموظف',
    'الفرع',
    'المبيعات المطلوبة',
    'المبيعات الفعلية',
    'النسبة',
    'قيمة الهدف',
    'مكافأة إضافية',
  ]

  const targetRows = targets.map((t) => [
    t.name,
    t.branch,
    Math.round(t.requiredSales),
    Math.round(t.actualSales),
    t.ratio,
    Math.round(t.targetValue),
    Math.round(t.extraBonus),
  ])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([salaryHeaders, ...salaryRows]),
    'المرتبات'
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([targetHeaders, ...targetRows]),
    'الأهداف'
  )
  XLSX.writeFile(wb, `تقرير_المرتبات_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function buildSalaryWhatsAppMessage(
  name: string,
  salary: number,
  extra: number,
  bonuses: number,
  absence: number,
  absenceValue: number,
  advances: number,
  netSalary: number
) {
  return `مرحباً ${name}،

تقرير مرتب شهر يوليو 2025:

- المرتب الأساسي: ${Math.round(salary)} ج.م.
- الإضافي: ${Math.round(extra)} ج.م.
- المكافآت: ${Math.round(bonuses)} ج.م.
- الغياب: ${absence} يوم (خصم ${Math.round(absenceValue)} ج.م.)
- السلف: ${Math.round(advances)} ج.م.

صافي المرتب: *${Math.round(netSalary)} ج.م.*

شكراً لجهودك،
إدارة الشركة`
}

export function buildTargetWhatsAppMessage(
  name: string,
  requiredSales: number,
  actualSales: number,
  ratio: number,
  targetValue: number,
  extraBonus: number
) {
  return `مرحباً ${name}،

تقرير تحقيق التارجت لشهر يوليو 2025:

- المبيعات المطلوبة: ${Math.round(requiredSales)} ج.م.
- المبيعات الفعلية: ${Math.round(actualSales)} ج.م.
- نسبة التحقيق: ${Math.round(ratio * 100)}%
- قيمة الهدف: ${Math.round(targetValue)} ج.م.
- المكافأة الإضافية: ${Math.round(extraBonus)} ج.م.

إجمالي المكافآت: *${Math.round(targetValue + extraBonus)} ج.م.*

مبروك على هذا الإنجاز،
إدارة الشركة`
}

export function openWhatsApp(phone: string, message: string) {
  const encodedMessage = encodeURIComponent(message)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/\n/g, '%0A')

  const cleanPhone = phone.replace(/\D/g, '')
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
}
