export default function PageLayout({ children, className = '', maxWidth = 'max-w-5xl', padTop = 'pt-24' }) {
  return (
    <main className={`${maxWidth} mx-auto px-4 sm:px-6 ${padTop} pb-12 w-full min-w-0 ${className}`}>
      {children}
    </main>
  )
}
