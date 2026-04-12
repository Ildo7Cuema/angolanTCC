import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Sparkles,
  FileText,
  Download,
  Zap,
  Shield,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const features = [
  {
    icon: Sparkles,
    title: 'IA Avançada',
    description: 'Motor de inteligência artificial que gera conteúdo académico de alta qualidade, estruturado por secções.',
  },
  {
    icon: FileText,
    title: 'Normas Académicas',
    description: 'Formatação automática de acordo com as normas das universidades angolanas.',
  },
  {
    icon: Download,
    title: 'Exportação Word',
    description: 'Exporte o seu TCC completo em formato .docx com formatação profissional.',
  },
  {
    icon: Zap,
    title: 'Geração Rápida',
    description: 'Obtenha a primeira versão do seu TCC em poucos minutos.',
  },
  {
    icon: Shield,
    title: 'Conteúdo Original',
    description: 'Conteúdo gerado exclusivamente para si com base no tema fornecido.',
  },
  {
    icon: BookOpen,
    title: 'Editor Integrado',
    description: 'Edite e ajuste todos os capítulos directamente na plataforma.',
  },
]

const steps = [
  { num: '01', title: 'Introduza o Tema', desc: 'Preencha o tema e os dados do seu TCC.' },
  { num: '02', title: 'IA Gera o Conteúdo', desc: 'A IA cria automaticamente todas as secções.' },
  { num: '03', title: 'Revise e Edite', desc: 'Ajuste o conteúdo gerado no editor integrado.' },
  { num: '04', title: 'Exporte em Word', desc: 'Descarregue o TCC completo formatado.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-display font-bold text-indigo-700">AngolaTCC IA</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
              Entrar
            </Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2.5 rounded-lg inline-flex items-center gap-2">
              Começar Agora <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Inteligência Artificial para o seu TCC
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6 text-slate-900"
          >
            Gere o seu <span className="text-indigo-600">TCC completo</span> com AngolaTCC IA
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A plataforma mais avançada de Angola para geração automática de Trabalhos de Conclusão de Curso.
            Introduza o tema e receba um TCC formatado e pronto para revisão.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-4 rounded-xl inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Gerar TCC Agora
            </Link>
            <a
              href="#como-funciona"
              className="btn-secondary text-lg px-8 py-4 rounded-xl inline-flex items-center justify-center gap-2"
            >
              Como Funciona <ChevronRight className="w-5 h-5" />
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: '500+', label: 'TCCs Gerados' },
              { value: '50+', label: 'Universidades' },
              { value: '98%', label: 'Satisfação' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-display font-bold text-indigo-600">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold mb-4 text-slate-900">
              Funcionalidades <span className="text-indigo-600">Poderosas</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Tudo o que precisa para criar o seu TCC de forma rápida e profissional.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass-card rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold mb-4 text-slate-900">
              Como <span className="text-indigo-600">Funciona</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Quatro passos simples para ter o seu TCC pronto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass-card rounded-2xl p-6 text-center relative"
              >
                <div className="text-5xl font-display font-extrabold text-indigo-100 mb-2">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections Generated */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold mb-4 text-slate-900">
              Secções <span className="text-indigo-600">Geradas</span>
            </h2>
            <p className="text-slate-500 text-lg">
              O nosso motor de IA gera todas as secções de um TCC completo.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Capa e Folha de Rosto',
                'Dedicatória e Agradecimentos',
                'Resumo e Abstract',
                'Sumário Automático',
                'Introdução',
                'Problema de Investigação',
                'Hipóteses',
                'Objectivos (Geral e Específicos)',
                'Justificativa',
                'Fundamentação Teórica',
                'Metodologia',
                'Resultados Esperados',
                'Conclusão',
                'Referências Bibliográficas',
              ].map((section) => (
                <div key={section} className="flex items-center gap-3 py-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 text-sm">{section}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-card rounded-3xl p-12 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-slate-900">
            Pronto para criar o seu TCC?
          </h2>
          <p className="text-slate-500 mb-8 text-lg">
            Junte-se a centenas de estudantes angolanos que já utilizam a AngolaTCC AI.
          </p>
          <Link
            to="/register"
            className="btn-primary text-lg px-8 py-4 rounded-xl inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Começar Gratuitamente
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span className="font-display font-bold text-indigo-700">AngolaTCC IA</span>
          </div>
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} AngolaTCC IA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
