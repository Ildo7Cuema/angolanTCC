import {
  BookOpen,
  BookmarkPlus,
  MessageSquare,
  AlignLeft,
  List,
  Lightbulb,
  Search,
  Layers,
  BarChart3,
  FileText,
  Calendar,
  DollarSign,
  HelpCircle,
} from 'lucide-react'

// Mapa de secções → TCC Normal
export const TCC_SECTIONS = [
  { id: 'capa', title: 'Capa', docxTitle: null, icon: BookOpen },
  { id: 'dedicatoria', title: 'Dedicatória', docxTitle: 'DEDICATÓRIA', icon: BookmarkPlus },
  { id: 'agradecimentos', title: 'Agradecimentos', docxTitle: 'AGRADECIMENTOS', icon: MessageSquare },
  { id: 'resumo', title: 'Resumo', docxTitle: 'RESUMO', icon: AlignLeft },
  { id: 'abstract', title: 'Abstract', docxTitle: 'ABSTRACT', icon: AlignLeft },
  { id: 'indice', title: 'Índice', docxTitle: 'ÍNDICE', icon: List },
  { id: 'introducao', title: 'Introdução', docxTitle: 'CAPÍTULO I – INTRODUÇÃO', icon: Lightbulb },
  { id: 'revisao_literatura', title: 'Revisão da Literatura', docxTitle: 'CAPÍTULO II – REVISÃO DA LITERATURA', icon: Search },
  { id: 'metodologia', title: 'Metodologia', docxTitle: 'CAPÍTULO III – METODOLOGIA', icon: Layers },
  { id: 'resultados', title: 'Resultados e Discussão', docxTitle: 'CAPÍTULO IV – RESULTADOS E DISCUSSÃO', icon: BarChart3 },
  { id: 'conclusao', title: 'Conclusão', docxTitle: 'CAPÍTULO V – CONCLUSÃO', icon: FileText },
  { id: 'referencias', title: 'Referências Bibliográficas', docxTitle: 'REFERÊNCIAS BIBLIOGRÁFICAS', icon: BookmarkPlus },
]

// Mapa de secções → Ante-projecto de Pesquisa
export const ANTEPROJECTO_SECTIONS = [
  { id: 'capa', title: 'Capa', docxTitle: null, icon: BookOpen },
  { id: 'introducao', title: 'Introdução (Problema e Objetivos)', docxTitle: '1. INTRODUÇÃO', icon: Lightbulb },
  { id: 'justificativa', title: 'Justificativa', docxTitle: '2. JUSTIFICATIVA', icon: HelpCircle },
  { id: 'fundamentacao_teorica', title: 'Fundamentação Teórica', docxTitle: '3. FUNDAMENTAÇÃO TEÓRICA', icon: Search },
  { id: 'metodologia', title: 'Metodologia Proposta', docxTitle: '4. METODOLOGIA', icon: Layers },
  { id: 'cronograma', title: 'Cronograma', docxTitle: '5. CRONOGRAMA', icon: Calendar },
  { id: 'orcamento', title: 'Orçamento', docxTitle: '6. ORÇAMENTO', icon: DollarSign },
  { id: 'referencias', title: 'Referências Bibliográficas', docxTitle: 'REFERÊNCIAS BIBLIOGRÁFICAS', icon: BookmarkPlus },
]

export function getSectionsForProject(projectType) {
  if (projectType === 'anteprojecto') return ANTEPROJECTO_SECTIONS;
  return TCC_SECTIONS;
}
