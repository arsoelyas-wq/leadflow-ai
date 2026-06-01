'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VisionRedirect() {
  const { t } = useI18n()
  const router = useRouter()
  useEffect(() => { router.replace('/leads') }, [router])
  return null
}
