import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getOrCreateVisitorId } from '../lib/visitorId'

const THROTTLE_MS = 10_000

export default function VisitTracker() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const lastTrackRef = useRef({ path: null, time: 0 })

  useEffect(() => {
    if (loading) return

    const path = location.pathname || '/'
    const now = Date.now()

    if (
      lastTrackRef.current.path === path &&
      now - lastTrackRef.current.time < THROTTLE_MS
    ) {
      return
    }
    lastTrackRef.current = { path, time: now }

    const visitorId = getOrCreateVisitorId()
    if (!visitorId) return

    const payload = {
      visitor_id: visitorId,
      user_id: user?.id ?? null,
      path,
      user_agent:
        typeof navigator !== 'undefined'
          ? (navigator.userAgent || '').slice(0, 500)
          : null,
      referer:
        typeof document !== 'undefined' && document.referrer
          ? document.referrer.slice(0, 500)
          : null,
    }

    supabase
      .from('site_visits')
      .insert(payload)
      .then(() => {})
      .catch(() => {})
  }, [location.pathname, user?.id, loading])

  return null
}
