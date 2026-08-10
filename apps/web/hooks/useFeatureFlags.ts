'use client'
import { useEffect, useState } from 'react'

export type FlagStatus = 'active' | 'disabled' | 'coming_soon'

type FlagsMap = Record<string, FlagStatus>

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const CACHE_KEY = 'ff_cache'
const CACHE_TTL = 10_000 // 10 seconds — hızlı yansıma için

let _cache: { data: FlagsMap; ts: number } | null = null

async function fetchFlags(): Promise<FlagsMap> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data
  try {
    const r = await fetch(`${API}/api/feature-flags`)
    const json = await r.json()
    const map: FlagsMap = {}
    ;(json.flags || []).forEach((f: any) => {
      map[f.flag_key] = f.status || (f.is_enabled ? 'active' : 'disabled')
    })
    _cache = { data: map, ts: Date.now() }
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_cache)) } catch {}
    }
    return map
  } catch {
    // Fall back to localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CACHE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          _cache = parsed
          return parsed.data
        }
      } catch {}
    }
    return {}
  }
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FlagsMap>(() => {
    // Hydrate from memory cache immediately (no flash)
    if (_cache) return _cache.data
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CACHE_KEY)
        if (stored) return JSON.parse(stored).data
      } catch {}
    }
    return {}
  })

  useEffect(() => {
    fetchFlags().then(setFlags)
  }, [])

  const getStatus = (key: string): FlagStatus => flags[key] || 'active'
  const isActive = (key: string) => getStatus(key) === 'active'
  const isComingSoon = (key: string) => getStatus(key) === 'coming_soon'
  const isDisabled = (key: string) => getStatus(key) === 'disabled'

  return { flags, getStatus, isActive, isComingSoon, isDisabled }
}
