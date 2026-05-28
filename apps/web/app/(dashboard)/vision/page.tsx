'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VisionRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/leads') }, [router])
  return null
}
