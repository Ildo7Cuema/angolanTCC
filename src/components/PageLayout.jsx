/**
 * PageLayout — wrapper consistente para páginas com Navbar fixa.
 *
 * Características:
 *  - max-width configurável
 *  - padding-top automático para a Navbar (h-14 mobile / h-16 desktop)
 *  - padding-bottom extra em mobile para a MobileNavigation (pb-28)
 *  - safe-area-inset-bottom respeitado
 */
export default function PageLayout({
  children,
  className = '',
  maxWidth = 'max-w-5xl',
  padTop = 'pt-20 sm:pt-24',
  padBottom = 'pb-28 md:pb-12',
  as: Tag = 'main',
}) {
  return (
    <Tag
      className={[
        'relative w-full min-w-0 flex-1',
        'mx-auto px-4 sm:px-6',
        maxWidth,
        padTop,
        padBottom,
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  )
}
