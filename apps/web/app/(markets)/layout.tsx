// Markets layout — public pages, no authentication required
// Note: No <html>/<body> here — root app/layout.tsx provides the document shell

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#030714', minHeight: '100vh', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {children}
    </div>
  )
}
