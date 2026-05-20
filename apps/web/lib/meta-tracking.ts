/**
 * Meta click/browser ID capture + UTM attribution helpers.
 *
 * Usage: call captureMetaParams() when creating a lead.
 * The returned object is merged into the lead payload sent to the API.
 */

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split(';').find(c => c.trim().startsWith(name + '='))
  return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : ''
}

function getURLParam(key: string): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get(key) || ''
}

function storeUTM() {
  if (typeof window === 'undefined') return
  const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
  const stored: Record<string, string> = {}
  let hasNew = false
  params.forEach(p => {
    const val = getURLParam(p)
    if (val) { stored[p] = val; hasNew = true }
  })
  if (hasNew) {
    try { sessionStorage.setItem('lf_utm', JSON.stringify(stored)) } catch {}
  }
}

function getStoredUTM(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem('lf_utm')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/** Build fbc cookie value from fbclid URL param (Meta spec) */
function buildFbc(fbclid: string): string {
  if (!fbclid) return ''
  const ts = Math.floor(Date.now() / 1000)
  return `fb.1.${ts}.${fbclid}`
}

/** Call on page load to capture UTM params from URL into session storage */
export function initMetaTracking() {
  storeUTM()
}

/**
 * Returns all Meta tracking fields to include when creating a lead:
 * fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term
 */
export function captureMetaParams(): {
  fbc?: string
  fbp?: string
  gclid?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
} {
  const utm  = getStoredUTM()
  const fbp  = getCookie('_fbp') || undefined
  const fbc  = getCookie('_fbc') || (utm.fbclid ? buildFbc(utm.fbclid) : undefined)
  const gclid = utm.gclid || undefined

  return {
    fbc,
    fbp,
    gclid,
    utm_source:   utm.utm_source   || undefined,
    utm_medium:   utm.utm_medium   || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content:  utm.utm_content  || undefined,
    utm_term:     utm.utm_term     || undefined,
  }
}
