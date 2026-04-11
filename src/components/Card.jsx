export default function Card({ children, className = '', hover = true, onClick }) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 ${hover ? '' : 'hover:border-transparent hover:shadow-none hover:transform-none'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardCompact({ children, className = '', hover = true }) {
  return (
    <div className={`glass-card rounded-xl p-4 ${hover ? '' : 'hover:border-transparent hover:shadow-none hover:transform-none'} ${className}`}>
      {children}
    </div>
  )
}
