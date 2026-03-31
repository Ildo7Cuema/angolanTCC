/**
 * URL da Edge Function.
 * Em dev: por defeito usa o proxy do Vite (`/functions-proxy`) → mesmo origem, sem CORS.
 * Em produção (build): URL directo do Supabase (o gateway deve permitir OPTIONS/CORS).
 * Opt-out: `VITE_FUNCTIONS_USE_DIRECT=true` (só para testar o URL directo).
 */
export function edgeFunctionUrl(functionName) {
  const name = functionName.replace(/^\//, '')
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || ''
  const forceDirect = import.meta.env.VITE_FUNCTIONS_USE_DIRECT === 'true'
  const useProxy =
    import.meta.env.DEV && !forceDirect

  if (useProxy) {
    return `/functions-proxy/${name}`
  }
  if (!base) {
    throw new Error('Define VITE_SUPABASE_URL no .env')
  }
  return `${base}/functions/v1/${name}`
}

/**
 * Invoca uma Edge Function com JWT + apikey (o mesmo que supabase.functions.invoke).
 */
export async function invokeEdgeFunction(functionName, body, accessToken, anonKey) {
  const url = edgeFunctionUrl(functionName)
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    throw new Error(
      m.includes('Failed to fetch')
        ? 'CORS ou rede. Em dev o proxy deve estar activo (sem VITE_FUNCTIONS_USE_DIRECT). Reinicia o Vite após alterar .env; confirma VITE_SUPABASE_URL no vite.config.'
        : m,
    )
  }

  const contentType = res.headers.get('Content-Type') || ''
  let data
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    if (typeof data === 'object' && data !== null) {
      const e = data.error
      if (typeof e === 'string') msg = e
      else if (e && typeof e === 'object' && e.message) msg = String(e.message)
      else if (data.message && typeof data.message === 'string') msg = data.message
      else if (data.code && typeof data.code === 'string') msg = `${data.code}: ${msg}`
      else if (e) msg = JSON.stringify(e)
    } else if (typeof data === 'string' && data.trim()) {
      msg = data
    }
    if (res.status === 404) {
      const isLocalProxy =
        typeof url === 'string' && url.startsWith('/functions-proxy')
      const functionMissing =
        typeof data === 'object' &&
        data !== null &&
        (data.code === 'NOT_FOUND' ||
          (typeof data.message === 'string' &&
            data.message.toLowerCase().includes('function was not found')))
      const likelyLocalVite404 =
        typeof data === 'string' &&
        /cannot (post|get)|^not found$/i.test(data.trim())

      if (functionMissing) {
        msg =
          'Função Edge não encontrada (404). Faz deploy: supabase functions deploy generate-tcc-fields ' +
          '(nome exacto da pasta em supabase/functions/). Confirma o project link.'
      } else if (isLocalProxy && likelyLocalVite404) {
        msg =
          'Proxy Vite inactivo (404 em localhost). Confirma vite.config.js (loadEnv com projectRoot) e VITE_SUPABASE_URL no .env; reinicia o npm run dev.'
      } else {
        msg =
          (typeof data === 'object' && data !== null && data.error)
            ? String(data.error)
            : 'Endpoint não encontrado (404). Confirma deploy/nome da função e, em dev, confirma também o proxy do Vite.'
      }
    }
    throw new Error(msg)
  }

  return data
}
