import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../ui/utils'

export function StatsChartCard({
  title,
  children,
  empty,
  className,
  heightClass = 'h-72',
}: {
  title: string
  children: ReactNode
  empty?: boolean
  className?: string
  heightClass?: string
}) {
  return (
    <Card className={cn('overflow-hidden border-gray-200 bg-gradient-to-br from-white to-slate-50/80 shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className={cn('flex items-center justify-center text-sm text-gray-500', heightClass)}>
            لا توجد بيانات في الفترة المحددة
          </div>
        ) : (
          <div className={heightClass}>{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
