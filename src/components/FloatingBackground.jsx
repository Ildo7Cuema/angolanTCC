import { GraduationCap, BookOpen, PenTool, Sparkles, FileText, FlaskConical, Globe, BrainCircuit, Bot, Cpu, Network, Glasses } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * FloatingBackground — partículas decorativas com física simples (colisão elástica).
 *
 * Estratégia de densidade:
 *  - Desktop (≥ md):   2 ícones por categoria → 24 partículas
 *  - Mobile  (< md):   1 ícone por categoria, tamanho menor → 12 partículas
 *  - reduced-motion:   posicionamento estático (sem física), sem animação
 *
 * Optimizações:
 *  - Single rAF loop, sem React state writes durante a animação
 *  - `transform: translate3d(...)` + `will-change: transform` para GPU
 *  - Detecção `prefers-reduced-motion` desliga apenas a animação, mantendo
 *    os ícones visíveis em posições aleatórias
 */
const ICONS_CONFIG = [
  { Icon: BrainCircuit,  color: 'text-fuchsia-500' },
  { Icon: Bot,           color: 'text-primary-600' },
  { Icon: Cpu,           color: 'text-sky-500' },
  { Icon: Network,       color: 'text-accent-500' },
  { Icon: Sparkles,      color: 'text-amber-400' },
  { Icon: GraduationCap, color: 'text-blue-600' },
  { Icon: Glasses,       color: 'text-orange-500' },
  { Icon: BookOpen,      color: 'text-emerald-500' },
  { Icon: PenTool,       color: 'text-rose-400' },
  { Icon: FileText,      color: 'text-slate-400' },
  { Icon: FlaskConical,  color: 'text-cyan-500' },
  { Icon: Globe,         color: 'text-teal-500' },
]

const random = (min, max) => Math.random() * (max - min) + min

export default function FloatingBackground() {
  const containerRef = useRef(null)
  const particlesRef = useRef(null)

  // Decisões one-time sobre o ambiente
  const envRef = useRef(
    typeof window !== 'undefined'
      ? {
          isMobile:        window.innerWidth < 768,
          reducedMotion:   window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        }
      : { isMobile: false, reducedMotion: false },
  )

  // Geração lazy das partículas (1 vez por mount)
  if (!particlesRef.current) {
    const generated = []
    let id = 0
    const W = typeof window !== 'undefined' ? window.innerWidth : 1280
    const H = typeof window !== 'undefined' ? window.innerHeight : 800
    const { isMobile } = envRef.current

    ICONS_CONFIG.forEach((config) => {
      // ─── Versão "grande" (sempre presente) ──────────────────────────
      const sizeLarge = isMobile
        ? random(34, 50)   // mobile: ícone "grande" mais pequeno
        : random(56, 72)
      generated.push({
        id: id++,
        config,
        size: sizeLarge,
        radius: sizeLarge / 2,
        x: random(0, Math.max(W - sizeLarge, 1)),
        y: random(0, Math.max(H - sizeLarge, 1)),
        vx: random(-0.5, 0.5),
        vy: random(-0.5, 0.5),
        opacity: isMobile ? random(0.18, 0.28) : random(0.22, 0.40),
      })

      // ─── Versão "pequena" (só em desktop, evita poluir mobile) ──────
      if (!isMobile) {
        const sizeSmall = random(24, 40)
        generated.push({
          id: id++,
          config,
          size: sizeSmall,
          radius: sizeSmall / 2,
          x: random(0, Math.max(W - sizeSmall, 1)),
          y: random(0, Math.max(H - sizeSmall, 1)),
          vx: random(-0.5, 0.5),
          vy: random(-0.5, 0.5),
          opacity: random(0.16, 0.30),
        })
      }
    })

    particlesRef.current = generated
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Se o utilizador prefere reduced-motion, deixamos os ícones estáticos
    if (envRef.current.reducedMotion) {
      const ps = particlesRef.current
      for (const p of ps) {
        if (p.el) p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      }
      return
    }

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

      // Massas proporcionais à área
      const m1 = Math.PI * p1.radius * p1.radius
      const m2 = Math.PI * p2.radius * p2.radius
      const im1 = 1 / m1
      const im2 = 1 / m2
      const j = -2 * vAlong / (im1 + im2)
      const ix = j * nx
      const iy = j * ny

      p1.vx -= ix * im1
      p2.vx += ix * im2
      p1.vy -= iy * im1
      p2.vy += iy * im2

      // Correcção posicional para evitar "stick"
      const penetration = minDist - dist
      const correction = (penetration / (im1 + im2)) * 0.8
      p1.x -= correction * nx * im1
      p2.x += correction * nx * im2
      p1.y -= correction * ny * im1
      p2.y += correction * ny * im2
    }

    const update = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const ps = particlesRef.current

      // Movimento + rebote nas paredes
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x <= 0)               { p.x = 0;            p.vx *= -1 }
        else if (p.x + p.size >= W) { p.x = W - p.size;   p.vx *= -1 }
        if (p.y <= 0)               { p.y = 0;            p.vy *= -1 }
        else if (p.y + p.size >= H) { p.y = H - p.size;   p.vy *= -1 }
      }

      // Colisões pairwise (n é pequeno: 12-24 partículas)
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          resolveCollision(ps[i], ps[j])
        }
      }

      // Aplicar transformações no DOM
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
      // Sem `-z-10`: elementos com z-index negativo caem atrás do
      // background do <body> (cor sólida) em muitos navegadores. A ordem
      // natural do DOM (este componente vem antes de <AppShell>) já o
      // coloca por trás do conteúdo, que tem `z-10`.
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Mesh gradient + animated bg pulses (definido em index.css) */}
      <div className="bg-mesh" />

      {/* Partículas */}
      {particlesRef.current.map((p) => {
        const Icon = p.config.Icon
        return (
          <div
            key={p.id}
            ref={(el) => { if (el) p.el = el }}
            className={`absolute ${p.config.color} flex items-center justify-center`}
            style={{
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              willChange: 'transform',
              transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
            }}
          >
            <Icon size={p.size * 0.78} strokeWidth={1.5} />
          </div>
        )
      })}
    </div>
  )
}
