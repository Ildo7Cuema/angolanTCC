/**
 * Skeleton — loading placeholders coerentes com o design system.
 *
 * Usa `.skeleton` (definido em index.css) com shimmer animado.
 */

export function Skeleton({ className = '', as: Tag = 'div', ...rest }) {
  return <Tag className={`skeleton ${className}`} aria-hidden {...rest} />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-dark-100 bg-white p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}

export function SkeletonStat({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-dark-100 bg-white p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="w-11 h-11 rounded-xl" />
      </div>
    </div>
  )
}

export default Skeleton
