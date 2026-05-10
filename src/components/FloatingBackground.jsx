import { GraduationCap, BookOpen, PenTool, Sparkles, FileText, FlaskConical, Globe, BrainCircuit, Bot, Cpu, Network, Glasses } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * FloatingBackground — partículas decorativas com física simples (colisão elástica).
 * Versão premium: densidade reduzida, opacidades subtis, desactivação automática
 * em viewports pequenos (mobile) e quando o utilizador prefere reduced-motion.
 */
const ICONS_CONFIG = [
  { Icon: BrainCircuit, color: 'text-fuchsia-500/70' },
  { Icon: Bot,          color: 'text-primary-600/70' },
  { Icon: Cpu,          color: 'text-sky-500/70' },
  { Icon: Network,      color: 'text-accent-500/70' },
  { Icon: Sparkles,     color: 'text-amber-400/70' },
  { Icon: GraduationCap,color: 'text-blue-600/70' },
  { Icon: Glasses,      color: 'text-orange-500/70' },
  { Icon: BookOpen,     color: 'text-emerald-500/70' },
  { Icon: PenTool,      color: 'text-rose-400/70' },
  { Icon: FileText,     color: 'text-slate-400/70' },
  { Icon: FlaskConical, color: 'text-cyan-500/70' },
  { Icon: Globe,        color: 'text-teal-500/70' },
]

const random = (min, max) => Math.random() * (max - min) + min

export default function FloatingBackground() {
  const containerRef = useRef(null)
  const particlesRef = useRef(null)

  // Detect environment uma vez
  const enabledRef = useRef(
    typeof window !== 'undefined' &&
    window.innerWidth >= 768 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  if (!particlesRef.current) {
    const generated = []
    let id = 0

    if (enabledRef.current) {
      // Apenas 1 ícone por categoria, tamanho médio — densidade muito menor
      ICONS_CONFIG.forEach((config) => {
        const size = random(36, 60)
        generated.push({
          id: id++,
          config,
          isBubble: false,
          size,
          radius: size / 2,
          x: random(0, window.innerWidth - size),
          y: random(0, window.innerHeight - size),
          vx: random(-0.35, 0.35),
          vy: random(-0.35, 0.35),
          opacity: random(0.10, 0.22),
          el: null,
        })
      })
    }
    particlesRef.current = generated
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabledRef.current) return

    let raf

    const resolveCollision = (p1, p2) => {
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      const minDist = p1.radius + p2.radius
      if (dist >= minDist) return

      const nx = dx / dist
      const ny = dy / dist
      const dvx = p2.vx - p1.vx
      const dvy = p2.vy - p1.vy
      const vAlong = dvx * nx + dvy * ny
      if (vAlong > 0) return

      const m1 = Math.PI * p1.radius * p1.radius
      const m2 = Math.PI * p2.radius * p2.radius
      const im1 = 1 / m1, im2 = 1 / m2
      const j = -(2) * vAlong / (im1 + im2)
      const ix = j * nx, iy = j * ny

      p1.vx -= ix * im1; p2.vx += ix * im2
      p1.vy -= iy * im1; p2.vy += iy * im2

      const penetration = minDist - dist
      const correction = penetration / (im1 + im2) * 0.8
      p1.x -= correction * nx * im1
      p2.x += correction * nx * im2
      p1.y -= correction * ny * im1
      p2.y += correction * ny * im2
    }

    const update = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const ps = particlesRef.current

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x <= 0)              { p.x = 0;             p.vx *= -1 }
        else if (p.x + p.size >= W) { p.x = W - p.size;    p.vx *= -1 }
        if (p.y <= 0)              { p.y = 0;             p.vy *= -1 }
        else if (p.y + p.size >= H) { p.y = H - p.size;    p.vy *= -1 }
      }

      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          resolveCollision(ps[i], ps[j])
        }
      }

      for (const p of ps) {
        if (p.el) p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      }
      raf = requestAnimationFrame(update)
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      <div className="bg-mesh" />
      {particlesRef.current.map((p) => {
        const Icon = p.config.Icon
        return (
          <div
            key={p.id}
            ref={(el) => { if (el) p.el = el }}
            className={`absolute ${p.config.color} flex items-center justify-center transition-opacity duration-700`}
            style={{
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              willChange: 'transform',
            }}
          >
            <Icon size={p.size * 0.78} strokeWidth={1.4} />
          </div>
        )
      })}
    </div>
  )
}
