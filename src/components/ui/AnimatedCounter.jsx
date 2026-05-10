import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'

/**
 * AnimatedCounter — conta de 0 → `value` ao entrar em viewport.
 * Suporta sufixos (e.g., "+", "%") e prefixos.
 */
export default function AnimatedCounter({
  value = 0,
  duration = 1.6,
  prefix = '',
  suffix = '',
  className = '',
  format = (n) => Math.round(n).toLocaleString('pt-AO'),
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const mv = useMotionValue(0)
  const display = useTransform(mv, (n) => `${prefix}${format(n)}${suffix}`)
  const [text, setText] = useState(`${prefix}${format(0)}${suffix}`)

  useEffect(() => {
    const unsub = display.on('change', setText)
    return unsub
  }, [display])

  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, value, duration, mv])

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}
