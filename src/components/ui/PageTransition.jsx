import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

/**
 * PageTransition — wrap em volta de Routes para animar a transição entre rotas.
 * Usa `useLocation()` como key para forçar exit/enter com AnimatePresence.
 */
export default function PageTransition({ children }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col w-full min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
