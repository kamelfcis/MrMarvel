import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'
import { cn } from './ui/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)
  return pages
}

type TablePaginationProps = {
  currentPage: number
  totalPages: number
  pageSize: PageSize
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: PageSize) => void
  className?: string
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalItems)
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages)

  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-t border-gray-200 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-sm text-gray-600">
        {totalItems === 0 ? (
          'لا توجد نتائج للعرض'
        ) : (
          <>
            عرض{' '}
            <span className="font-medium text-gray-900">{rangeStart.toLocaleString('ar-EG')}</span>
            {' – '}
            <span className="font-medium text-gray-900">{rangeEnd.toLocaleString('ar-EG')}</span>
            {' من '}
            <span className="font-medium text-gray-900">{totalItems.toLocaleString('ar-EG')}</span>
          </>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="page-size" className="whitespace-nowrap text-sm text-gray-600">
            عدد الصفوف:
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
          >
            <SelectTrigger id="page-size" className="h-9 w-[5.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size.toLocaleString('ar-EG')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col items-start gap-2 sm:items-center">
            <p className="text-sm text-gray-500">
              الصفحة{' '}
              <span className="font-medium text-gray-900">
                {currentPage.toLocaleString('ar-EG')}
              </span>{' '}
              من{' '}
              <span className="font-medium text-gray-900">
                {totalPages.toLocaleString('ar-EG')}
              </span>
            </p>

            <Pagination className="justify-start sm:justify-center">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  />
                </PaginationItem>

                {visiblePages.map((page, index) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={() => onPageChange(page)}
                      >
                        {page.toLocaleString('ar-EG')}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  )
}

export { PAGE_SIZE_OPTIONS }
