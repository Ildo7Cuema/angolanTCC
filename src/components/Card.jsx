/**
 * Legacy Card — re-export do novo componente em src/components/ui/Card.jsx.
 * Mantém compatibilidade com `import Card from '../components/Card'`.
 */
export { default, CardHeader, CardBody, CardFooter } from './ui/Card'

import Card from './ui/Card'

export function CardCompact({ children, className = '', hover = true, ...rest }) {
  return (
    <Card padding="sm" className={`rounded-xl ${hover ? '' : 'pointer-events-none'} ${className}`} {...rest}>
      {children}
    </Card>
  )
}
