import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  text: string
}

export default function ResultRenderer({ text }: Props) {
  if (!text) return null
  return (
    <div style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.7' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: '0 0 0.6rem' }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: '#a78bfa' }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '1.25rem', margin: '0.3rem 0 0.6rem', listStyleType: 'disc' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '1.25rem', margin: '0.3rem 0 0.6rem' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: '0.25rem' }}>{children}</li>
          ),
          code: ({ children }) => (
            <code style={{ background: '#0a0a0f', color: '#a78bfa', padding: '1px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0 0.4rem' }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.3rem' }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600, margin: '0.4rem 0 0.2rem' }}>{children}</h3>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '0.75rem 0' }} />
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '0.5rem 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ borderBottom: '1px solid #334155' }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th style={{
              padding: '6px 12px',
              textAlign: 'left',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding: '6px 12px',
              borderBottom: '1px solid #0f172a',
              color: '#cbd5e1',
            }}>
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {children}
            </tr>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '3px solid #7c3aed',
              paddingLeft: '0.75rem',
              margin: '0.5rem 0',
              color: '#94a3b8',
              fontStyle: 'italic',
            }}>
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
