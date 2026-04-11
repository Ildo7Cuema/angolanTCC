import { GraduationCap, BookOpen, PenTool, Sparkles, FileText, FlaskConical, Globe, BrainCircuit, Bot, Cpu, Network, Glasses } from 'lucide-react'
import { useEffect, useRef } from 'react'

const ICONS_CONFIG = [
  { Icon: BrainCircuit, color: 'text-fuchsia-500' },
  { Icon: Bot, color: 'text-indigo-600' },
  { Icon: Cpu, color: 'text-sky-500' },
  { Icon: Network, color: 'text-violet-500' },
  { Icon: Sparkles, color: 'text-amber-400' },
  { Icon: GraduationCap, color: 'text-blue-600' },
  { Icon: Glasses, color: 'text-orange-500' },
  { Icon: BookOpen, color: 'text-emerald-500' },
  { Icon: PenTool, color: 'text-rose-400' },
  { Icon: FileText, color: 'text-slate-400' },
  { Icon: FlaskConical, color: 'text-cyan-500' },
  { Icon: Globe, color: 'text-teal-500' }
]

const random = (min, max) => Math.random() * (max - min) + min

export default function FloatingBackground() {
  const containerRef = useRef(null)
  
  // Initialize lazily to ensure deterministic UI render before the physics engine kicks in
  const particlesRef = useRef(null)
  if (!particlesRef.current) {
    const generatedParticles = []
    let idCounter = 0

    // 1. Generate exactly two of each icon: one large, one small
    ICONS_CONFIG.forEach(config => {
      // Large version
      const sizeLarge = random(56, 72)
      generatedParticles.push({
        id: idCounter++,
        config,
        isBubble: false,
        size: sizeLarge,
        radius: sizeLarge / 2,
        x: random(0, window.innerWidth - sizeLarge),
        y: random(0, window.innerHeight - sizeLarge),
        vx: random(-0.5, 0.5),
        vy: random(-0.5, 0.5),
        opacity: random(0.2, 0.4),
        el: null
      })

      // Small version
      const sizeSmall = random(24, 40)
      generatedParticles.push({
        id: idCounter++,
        config,
        isBubble: false,
        size: sizeSmall,
        radius: sizeSmall / 2,
        x: random(0, window.innerWidth - sizeSmall),
        y: random(0, window.innerHeight - sizeSmall),
        vx: random(-0.5, 0.5),
        vy: random(-0.5, 0.5),
        opacity: random(0.15, 0.3),
        el: null
      })
    })

    // 2. Generate generic floating bubbles smoothly (REDUCED TO 0)
    const NUM_BUBBLES = 0
    for (let i = 0; i < NUM_BUBBLES; i++) {
      const bubbleSize = random(30, 80)
      generatedParticles.push({
        id: idCounter++,
        config: null,
        isBubble: true,
        size: bubbleSize,
        radius: bubbleSize / 2,
        x: random(0, window.innerWidth - bubbleSize),
        y: random(0, window.innerHeight - bubbleSize),
        vx: random(-0.5, 0.5),
        vy: random(-0.5, 0.5),
        opacity: random(0.15, 0.3),
        el: null
      })
    }

    particlesRef.current = generatedParticles
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let animationFrameId;

    const resolveCollision = (p1, p2) => {
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = p1.radius + p2.radius

      if (distance < minDistance) {
        // Calculate collision normal
        const nx = dx / distance
        const ny = dy / distance

        // Calculate relative velocity
        const dvx = p2.vx - p1.vx
        const dvy = p2.vy - p1.vy

        // Calculate relative velocity in terms of the normal direction
        const velAlongNormal = dvx * nx + dvy * ny

        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return

        // Compute restitution (bounciness) -> 1 is perfectly elastic
        const restitution = 1

        // Inverse mass (smaller = heavier, let's treat area as mass)
        const mass1 = Math.PI * p1.radius * p1.radius
        const mass2 = Math.PI * p2.radius * p2.radius
        const invMass1 = 1 / mass1
        const invMass2 = 1 / mass2

        const impulseScalar = -(1 + restitution) * velAlongNormal / (invMass1 + invMass2)

        const impulseX = impulseScalar * nx
        const impulseY = impulseScalar * ny

        // Apply impulse
        p1.vx -= impulseX * invMass1
        p2.vx += impulseX * invMass2
        p1.vy -= impulseY * invMass1
        p2.vy += impulseY * invMass2

        // Positional correction to prevent sinking
        const percent = 0.8 // penetration percentage to correct
        const slop = 0.01 // penetration allowance
        const penetration = minDistance - distance
        const correction = Math.max(penetration - slop, 0) / (invMass1 + invMass2) * percent
        
        const cx = correction * nx
        const cy = correction * ny

        p1.x -= cx * invMass1
        p2.x += cx * invMass2
        p1.y -= cy * invMass1
        p2.y += cy * invMass2
      }
    }

    const update = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      const particles = particlesRef.current

      // Update positions & simple wall collisions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.x += p.vx
        p.y += p.vy

        // Wall collisions
        if (p.x <= 0) {
          p.x = 0
          p.vx *= -1
        } else if (p.x + p.size >= width) {
          p.x = width - p.size
          p.vx *= -1
        }

        if (p.y <= 0) {
          p.y = 0
          p.vy *= -1
        } else if (p.y + p.size >= height) {
          p.y = height - p.size
          p.vy *= -1
        }
      }

      // Resolve element-to-element collisions
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          resolveCollision(particles[i], particles[j])
        }
      }

      // Apply transformations to DOM elements
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (p.el) {
          p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
        }
      }

      animationFrameId = requestAnimationFrame(update)
    }

    // Start loop
    animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="bg-mesh" />

      {particlesRef.current.map((p, index) => {
        if (p.isBubble) {
          return (
            <div
              key={p.id}
              ref={(el) => {
                if (el) p.el = el
              }}
              className="absolute rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md"
              style={{
                width: p.size,
                height: p.size,
                opacity: p.opacity * 1.5,
                willChange: 'transform'
              }}
            />
          )
        }

        const Icon = p.config.Icon
        return (
          <div
            key={p.id}
            ref={(el) => {
              if (el) p.el = el
            }}
            className={`absolute ${p.config.color} flex items-center justify-center`}
            style={{
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              willChange: 'transform'
            }}
          >
            <Icon size={p.size * 0.8} strokeWidth={1.5} />
          </div>
        )
      })}
    </div>
  )
}
