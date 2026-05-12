// Helpers para identificar o navegador do visitante (mesmo quando anónimo).
// O visitor_id é guardado em localStorage e é partilhado pelo VisitTracker
// e pelo AuthContext (para fazer "claim" das visitas após login/registo).

export const VISITOR_ID_STORAGE_KEY = 'aTccVisitorId'

export function getVisitorId() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

export function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return null
  try {
    let id = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}
