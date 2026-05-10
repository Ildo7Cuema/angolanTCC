import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  BookOpen, Sparkles, FileText, Download, Zap, Shield, GraduationCap,
  ArrowRight, CheckCircle2, ChevronRight, Wand2, Star, Globe2, Lock, ChevronDown,
} from 'lucide-react'
import AnimatedCounter from '../components/ui/AnimatedCounter'

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
}

const FEATURES = [
  { icon: Sparkles,  title: 'IA Avançada',         desc: 'Motor Claude Sonnet treinado para conteúdo académico angolano de altíssima qualidade.' },
  { icon: FileText,  title: 'Normas ABNT/APA',      desc: 'Formatação automática nas normas exigidas pelas universidades angolanas.' },
  { icon: Download,  title: 'Exportação Word',      desc: 'Documento .docx com capa, folha de rosto, gráficos e tabelas embutidas.' },
  { icon: Zap,       title: 'Ultra Rápido',         desc: 'TCC completo em poucos minutos. Cada secção é regenerável individualmente.' },
  { icon: Shield,    title: 'Conteúdo Original',    desc: 'Texto único gerado para si com base no tema e dados que fornecer.' },
  { icon: BookOpen,  title: 'Editor Integrado',     desc: 'Edite, humanize e ajuste todos os capítulos directamente no browser.' },
]

const STEPS = [
  { num: '01', title: 'Introduza o Tema', desc: 'Preencha o título e dados do trabalho. A IA sugere ideias enquanto escreve.' },
  { num: '02', title: 'IA Gera o Conteúdo', desc: 'Todas as secções são geradas: introdução, metodologia, conclusão, referências.' },
  { num: '03', title: 'Revise e Edite', desc: 'Editor visual com preview de tabelas, gráficos e diagramas Mermaid.' },
  { num: '04', title: 'Exporte em Word', desc: 'Descarregue o ficheiro .docx pronto para imprimir e entregar.' },
]

const SECTIONS_LIST = [
  'Capa e Folha de Rosto', 'Dedicatória e Agradecimentos', 'Resumo e Abstract',
  'Sumário Automático', 'Introdução', 'Problema de Investigação',
  'Hipóteses', 'Objectivos (Geral e Específicos)', 'Justificativa',
  'Fundamentação Teórica', 'Metodologia', 'Resultados Esperados',
  'Conclusão', 'Referências Bibliográficas',
]

const TESTIMONIALS = [
  { name: 'Joana M.', course: 'Direito · UAN',       text: 'O AngolaTCC AI poupou-me semanas de trabalho. A qualidade do texto gerado impressionou o meu orientador.' },
  { name: 'Carlos B.', course: 'Eng. Informática · UJES', text: 'Os gráficos automáticos no Word e o suporte a diagramas Mermaid foram um diferencial enorme.' },
  { name: 'Sofia T.',  course: 'Gestão · UCAN',       text: 'Interface linda e fluida no telemóvel. Editei tudo no autocarro a caminho da faculdade.' },
]

// ─── Mini-mockup do editor (decorativo) ────────────────────────────────────
function EditorMockup() {
  return (
    <div className="relative">
      {/* glow atrás */}
      <div className="absolute -inset-6 bg-gradient-radial from-primary-500/20 via-accent-500/10 to-transparent blur-2xl rounded-[3rem] -z-10" />

      <div className="relative rounded-3xl border border-dark-200/60 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* fake browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-100 bg-dark-50/60">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <div className="ml-3 flex-1 h-6 rounded-md bg-white border border-dark-100 flex items-center px-2 text-[10px] text-dark-400 font-mono">
            angolatcc.ai/project/...
          </div>
        </div>

        <div className="grid grid-cols-12">
          {/* sidebar */}
          <aside className="col-span-3 border-r border-dark-100 p-3 bg-dark-50/40 hidden sm:block">
            <p className="text-[10px] font-semibold tracking-widest text-dark-400 uppercase mb-3">Secções</p>
            {['Introdução', 'Revisão', 'Metodologia', 'Resultados', 'Conclusão'].map((s, i) => (
              <div
                key={s}
                className={[
                  'px-2.5 py-1.5 rounded-lg text-xs mb-1 flex items-center justify-between',
                  i === 1 ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-dark-600',
                ].join(' ')}
              >
                <span className="truncate">{s}</span>
                {i < 3 && <CheckCircle2 className="w-3 h-3 text-success-500" />}
              </div>
            ))}
          </aside>

          {/* main */}
          <div className="col-span-12 sm:col-span-9 p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm sm:text-base font-display font-bold text-dark-900">Revisão da Literatura</h4>
              <span className="badge badge-info text-[10px]">
                <Wand2 className="w-3 h-3" /> Gerado por IA
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="h-2.5 rounded-full bg-dark-100 w-11/12 skeleton" />
              <div className="h-2.5 rounded-full bg-dark-100 w-full skeleton" />
              <div className="h-2.5 rounded-full bg-dark-100 w-10/12 skeleton" />
              <div className="h-2.5 rounded-full bg-dark-100 w-9/12 skeleton" />
              <div className="h-2.5 rounded-full bg-dark-100 w-11/12 skeleton" />
            </div>

            <div className="mt-5 flex items-center gap-2 text-[10px] text-success-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              5/12 secções concluídas
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4])

  return (
    <div className="min-h-screen relative">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-lg font-display font-bold tracking-tight text-dark-900">
              AngolaTCC <span className="text-primary-600">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-10 px-4 items-center text-sm font-medium text-dark-600 hover:text-dark-900 rounded-lg hover:bg-dark-100 transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="btn-primary h-10 px-4 sm:px-5 rounded-xl inline-flex items-center gap-2 text-sm"
            >
              Começar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* glows decorativos */}
        <div className="absolute top-20 left-1/4 w-[28rem] h-[28rem] bg-primary-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[24rem] h-[24rem] bg-accent-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-5xl mx-auto text-center relative"
        >
          <motion.span
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="eyebrow"
          >
            <Sparkles className="w-3.5 h-3.5" /> NOVO · IA Claude Sonnet
          </motion.span>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold leading-[1.05] tracking-tightest text-dark-900"
          >
            Gere o seu <span className="gradient-text">TCC completo</span><br className="hidden sm:block" />
            em minutos, com IA de elite.
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="mt-6 text-base sm:text-xl text-dark-500 max-w-2xl mx-auto leading-relaxed"
          >
            A plataforma académica mais avançada de Angola. Introduza o título e receba um TCC ou Ante-Projecto formatado, com gráficos, tabelas e referências, pronto para entregar.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
          >
            <Link
              to="/register"
              className="btn-primary h-14 px-7 rounded-2xl inline-flex items-center justify-center gap-2 text-base w-full sm:w-auto"
            >
              <Sparkles className="w-5 h-5" />
              Gerar TCC Agora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#como-funciona"
              className="btn-secondary h-14 px-7 rounded-2xl inline-flex items-center justify-center gap-2 text-base w-full sm:w-auto"
            >
              Como Funciona <ChevronDown className="w-5 h-5" />
            </a>
          </motion.div>

          {/* trust indicators */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-dark-400"
          >
            <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4" /> Pagamento Express seguro</span>
            <span className="inline-flex items-center gap-1.5"><Globe2 className="w-4 h-4" /> 100% em Português Angolano</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex">
                {[0,1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-400" />)}
              </span>
              4.9/5 em satisfação
            </span>
          </motion.div>

          {/* mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <EditorMockup />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 sm:gap-8">
          {[
            { value: 500, suffix: '+', label: 'TCCs Gerados' },
            { value: 50,  suffix: '+', label: 'Universidades' },
            { value: 98,  suffix: '%', label: 'Satisfação' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
              className="text-center"
            >
              <div className="text-3xl sm:text-5xl font-display font-extrabold gradient-text leading-none">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs sm:text-sm text-dark-500 mt-2 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14 sm:mb-16"
          >
            <span className="eyebrow"><Zap className="w-3.5 h-3.5" /> FUNCIONALIDADES</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-dark-900">
              Tudo o que precisa, <span className="gradient-text">num só lugar</span>
            </h2>
            <p className="text-dark-500 text-base sm:text-lg max-w-xl mx-auto mt-4">
              Uma suite completa para criar, editar e exportar trabalhos académicos profissionais.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={i}
                className="premium-card p-6 sm:p-7 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 ring-1 ring-primary-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 ease-spring">
                  <f.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-display font-bold text-dark-900 mb-2">{f.title}</h3>
                <p className="text-sm text-dark-500 leading-relaxed">{f.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14 sm:mb-16"
          >
            <span className="eyebrow">PROCESSO</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-dark-900">
              Quatro passos. <span className="gradient-text">Zero stress.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="relative glass-card p-6 sm:p-7 group"
              >
                <div className="absolute top-4 right-5 text-5xl sm:text-6xl font-display font-black text-primary-100 leading-none select-none">
                  {step.num}
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-4 shadow-glow-sm">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-dark-900 mb-1.5">{step.title}</h3>
                  <p className="text-sm text-dark-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIONS LIST ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">CONTEÚDO COMPLETO</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-dark-900">
              14 secções <span className="gradient-text">geradas para si</span>
            </h2>
            <p className="text-dark-500 text-base sm:text-lg mt-4 max-w-xl mx-auto">
              O motor de IA cria todas as secções de um TCC completo, prontas a editar.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-2 gap-2.5">
              {SECTIONS_LIST.map((s) => (
                <div key={s} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-primary-50/50 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-success-50 ring-1 ring-success-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-600" />
                  </span>
                  <span className="text-sm text-dark-700">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="eyebrow">DEPOIMENTOS</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-dark-900">
              Estudantes <span className="gradient-text">a sorrir</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-6 sm:p-7"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[0,1,2,3,4].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 stroke-amber-400" />)}
                </div>
                <blockquote className="text-sm text-dark-700 leading-relaxed">
                  "{t.text}"
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center font-display font-bold text-sm">
                    {t.name.split(' ').map(p => p[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-dark-900">{t.name}</div>
                    <div className="text-xs text-dark-500">{t.course}</div>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center rounded-4xl p-10 sm:p-16 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 text-white shadow-glow-lg"
        >
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-accent-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 ring-1 ring-white/30">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold leading-tight tracking-tight mb-4">
              Pronto para <span className="text-amber-200">conquistar</span> o seu TCC?
            </h2>
            <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Junte-se a centenas de estudantes angolanos que terminaram o curso a sorrir.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white text-primary-700 font-semibold text-base shadow-2xl hover:scale-105 hover:bg-amber-50 transition-all duration-300 ease-spring"
            >
              <Sparkles className="w-5 h-5" />
              Começar Gratuitamente
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 sm:px-6 border-t border-dark-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5" />
            </span>
            <span className="font-display font-bold text-dark-900">
              AngolaTCC <span className="text-primary-600">AI</span>
            </span>
          </div>
          <p className="text-dark-400 text-xs sm:text-sm text-center md:text-right">
            © {new Date().getFullYear()} AngolaTCC AI · Feito em Angola, com IA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
