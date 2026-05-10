/**
 * Perfis de formatação por Universidade Angolana.
 *
 * Cada universidade tem o seu próprio modelo de capa, folha de rosto,
 * preferência de norma (ABNT, APA ou Vancouver) e estrutura de
 * faculdade/departamento. Este módulo centraliza essas regras para
 * que o exportador DOCX e o formulário de criação consigam adaptar
 * automaticamente o documento gerado.
 *
 * Quando a universidade não tem perfil específico, é usado o perfil
 * `DEFAULT_PROFILE` (norma ABNT, ministério genérico).
 */

/**
 * Constantes das normas suportadas.
 */
export const ACADEMIC_NORMS = {
  ABNT:      'ABNT',       // Brasileira — predominante em Angola
  APA:       'APA',        // Psicologia, Educação, Ciências Sociais
  VANCOUVER: 'VANCOUVER',  // Saúde, Enfermagem, Medicina
}

/**
 * Estrutura de um perfil:
 *
 *  defaultNorm:    'ABNT' | 'APA' | 'VANCOUVER'  (norma recomendada)
 *  city:           Cidade-sede da universidade (para "Cidade, Ano")
 *  ministryHeader: Texto institucional acima da capa (linha 1)
 *  countryHeader:  Texto da linha do país (normalmente "REPÚBLICA DE ANGOLA")
 *  facultyPrefix:  "Faculdade de" | "Instituto Superior de" | "Escola Superior de"
 *  degreeLabel:    Label do grau ("LICENCIATURA", "BACHARELATO")
 *  coverStyle:     'classic' | 'compact' | 'modern'
 *  fontFamily:     'Times New Roman' | 'Arial' | 'Calibri'
 *  bodyFontSize:   Tamanho do corpo em half-points (24 = 12pt)
 *  citationStyle:  Estilo de citação ('autor-data', 'numerica')
 */

const PROFILE_BASE = {
  defaultNorm:    ACADEMIC_NORMS.ABNT,
  city:           'Luanda',
  countryHeader:  'REPÚBLICA DE ANGOLA',
  ministryHeader: 'MINISTÉRIO DO ENSINO SUPERIOR, CIÊNCIA, TECNOLOGIA E INOVAÇÃO',
  facultyPrefix:  'Faculdade de',
  degreeLabel:    'LICENCIATURA',
  coverStyle:     'classic',
  fontFamily:     'Times New Roman',
  bodyFontSize:   24, // 12pt
  citationStyle:  'autor-data',
}

/**
 * Perfis específicos. As chaves devem corresponder ao nome EXACTO
 * usado em `angolianUniversitiesByProvince` em NewProject.jsx (ou
 * conter uma sub-string única — a função `getUniversityProfile`
 * aceita correspondência parcial case-insensitive).
 */
export const UNIVERSITY_PROFILES = {
  // ─── LUANDA ─────────────────────────────────────────────────────
  'Universidade Agostinho Neto (UAN)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Universidade Católica de Angola (UCAN)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.APA,
    fontFamily: 'Times New Roman',
  },
  'Universidade Lusíada de Angola (ULA)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.APA,
  },
  'Universidade Metodista de Angola (UMA)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Universidade Jean Piaget de Angola': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Departamento de',
    coverStyle: 'modern',
    defaultNorm: ACADEMIC_NORMS.APA,
  },
  'Universidade Privada de Angola (UPRA)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Universidade Óscar Ribas (UÓR)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.APA,
  },
  'Universidade de Belas (UNIBELAS)': {
    ...PROFILE_BASE,
    city: 'Belas',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Universidade Técnica de Angola (UTANGA)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'modern',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Universidade Independente de Angola (UNIA)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior Politécnico Gregório Semedo (IGS)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Departamento de Engenharia e',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior de Ciências de Educação de Luanda (ISCED-Luanda)': {
    ...PROFILE_BASE,
    city: 'Luanda',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.APA,
  },

  // ─── HUÍLA ───────────────────────────────────────────────────────
  'Universidade Mandume ya Ndemofayo (UMN)': {
    ...PROFILE_BASE,
    city: 'Lubango',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior de Ciências de Educação da Huíla (ISCED-Huíla)': {
    ...PROFILE_BASE,
    city: 'Lubango',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.APA,
  },
  'Instituto Superior Politécnico da Huíla (ISPH)': {
    ...PROFILE_BASE,
    city: 'Lubango',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── HUAMBO ──────────────────────────────────────────────────────
  'Universidade José Eduardo dos Santos (UJES) – Huambo': {
    ...PROFILE_BASE,
    city: 'Huambo',
    facultyPrefix: 'Faculdade de',
    coverStyle: 'classic',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior de Ciências de Educação do Huambo (ISCED-Huambo)': {
    ...PROFILE_BASE,
    city: 'Huambo',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.APA,
  },

  // ─── BENGUELA ────────────────────────────────────────────────────
  'Universidade Katyavala Bwila (UKB)': {
    ...PROFILE_BASE,
    city: 'Benguela',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
  'Instituto Superior de Ciências da Saúde de Benguela (ISCISAB)': {
    ...PROFILE_BASE,
    city: 'Benguela',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.VANCOUVER,
  },

  // ─── UÍGE ────────────────────────────────────────────────────────
  'Universidade Kimpa Vita (UKV)': {
    ...PROFILE_BASE,
    city: 'Uíge',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── NAMIBE ──────────────────────────────────────────────────────
  'Instituto Superior Politécnico do Namibe (ISPN)': {
    ...PROFILE_BASE,
    city: 'Moçâmedes',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── CABINDA ─────────────────────────────────────────────────────
  'Instituto Superior Politécnico de Cabinda (ISPDC)': {
    ...PROFILE_BASE,
    city: 'Cabinda',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── CUNENE ──────────────────────────────────────────────────────
  'Universidade Ondjiva (UO)': {
    ...PROFILE_BASE,
    city: 'Ondjiva',
    facultyPrefix: 'Faculdade de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── LUNDA ───────────────────────────────────────────────────────
  'Instituto Superior Politécnico do Dundo (ISPD)': {
    ...PROFILE_BASE,
    city: 'Dundo',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── MALANJE ─────────────────────────────────────────────────────
  'Instituto Superior Politécnico de Malanje (ISPM)': {
    ...PROFILE_BASE,
    city: 'Malanje',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },

  // ─── MOXICO ──────────────────────────────────────────────────────
  'Instituto Superior Politécnico do Moxico (ISPMO)': {
    ...PROFILE_BASE,
    city: 'Luena',
    facultyPrefix: 'Departamento de',
    defaultNorm: ACADEMIC_NORMS.ABNT,
  },
}

export const DEFAULT_PROFILE = { ...PROFILE_BASE }

/**
 * Heurística simples para inferir a cidade quando o nome da universidade
 * sugere uma localização específica.
 */
function inferCityFromName(universityName = '') {
  const name = String(universityName).toLowerCase()
  if (name.includes('lubango') || name.includes('huíla') || name.includes('mandume')) return 'Lubango'
  if (name.includes('huambo') || name.includes('ujes')) return 'Huambo'
  if (name.includes('benguela') || name.includes('katyavala')) return 'Benguela'
  if (name.includes('uíge') || name.includes('kimpa vita')) return 'Uíge'
  if (name.includes('namibe') || name.includes('moçâmedes')) return 'Moçâmedes'
  if (name.includes('cabinda')) return 'Cabinda'
  if (name.includes('ondjiva') || name.includes('cunene')) return 'Ondjiva'
  if (name.includes('dundo') || name.includes('lunda')) return 'Dundo'
  if (name.includes('malanje')) return 'Malanje'
  if (name.includes('luena') || name.includes('moxico')) return 'Luena'
  return 'Luanda'
}

/**
 * Heurística para sugerir norma com base no curso ou área quando a
 * universidade não tem norma definida explicitamente.
 */
function inferNormFromCourse(course = '') {
  const c = String(course).toLowerCase()
  if (
    c.includes('enfermagem') ||
    c.includes('medicina') ||
    c.includes('saúde') ||
    c.includes('farmácia')
  ) return ACADEMIC_NORMS.VANCOUVER
  if (
    c.includes('psicologia') ||
    c.includes('educação') ||
    c.includes('pedagogia')
  ) return ACADEMIC_NORMS.APA
  return ACADEMIC_NORMS.ABNT
}

/**
 * Devolve o perfil completo da universidade. Se não houver
 * correspondência exacta, tenta uma correspondência parcial
 * (case-insensitive) e cai no perfil DEFAULT.
 *
 * @param {string} universityName Nome exacto ou parcial da universidade
 * @param {{course?: string, cityOverride?: string}} options
 * @returns {object} Perfil completo
 */
export function getUniversityProfile(universityName, options = {}) {
  if (!universityName) {
    return {
      ...DEFAULT_PROFILE,
      city: options.cityOverride || DEFAULT_PROFILE.city,
      defaultNorm: inferNormFromCourse(options.course),
    }
  }

  // 1) Match exacto
  const exact = UNIVERSITY_PROFILES[universityName]
  if (exact) {
    return {
      ...exact,
      city: options.cityOverride || exact.city,
    }
  }

  // 2) Match parcial (case-insensitive) — útil quando o nome vem com
  //    acentuação ligeiramente diferente ou sufixo extra.
  const lcName = universityName.toLowerCase()
  for (const [key, profile] of Object.entries(UNIVERSITY_PROFILES)) {
    const lcKey = key.toLowerCase()
    if (lcName.includes(lcKey.split('(')[0].trim()) || lcKey.includes(lcName)) {
      return {
        ...profile,
        city: options.cityOverride || profile.city,
      }
    }
  }

  // 3) Sem perfil — usa DEFAULT mas tenta inferir cidade pelo nome
  return {
    ...DEFAULT_PROFILE,
    city: options.cityOverride || inferCityFromName(universityName),
    defaultNorm: inferNormFromCourse(options.course),
  }
}

/**
 * Helper conveniência — só a norma sugerida.
 */
export function suggestNormForUniversity(universityName, course) {
  return getUniversityProfile(universityName, { course }).defaultNorm
}

/**
 * Lista das normas suportadas para mostrar no selector.
 */
export const NORM_OPTIONS = [
  { value: ACADEMIC_NORMS.ABNT,      label: 'ABNT (recomendado para Angola)', description: 'Norma brasileira — ampla utilização' },
  { value: ACADEMIC_NORMS.APA,       label: 'APA (7ª edição)',                 description: 'Psicologia, Educação, Ciências Sociais' },
  { value: ACADEMIC_NORMS.VANCOUVER, label: 'Vancouver',                        description: 'Saúde, Medicina, Enfermagem' },
]
