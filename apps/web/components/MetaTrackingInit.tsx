'use client'
import { useEffect } from 'react'
import { initMetaTracking } from '@/lib/meta-tracking'

export default function MetaTrackingInit() {
  useEffect(() => { initMetaTracking() }, [])
  return null
}
