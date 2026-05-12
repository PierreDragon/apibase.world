import ReactMarkdown from 'react-markdown'

interface Props {
  text: string
}

export default function ResultRenderer({ text }: Props) {
  if (!text) return null
  return (
    <div className="markdown" style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: '0 0 0.5rem' }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: '#a78bfa' }}>{children}</em>,
          ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: '0.2rem' }}>{children}</li>,
          code: ({ children }) => (
            <code style={{ background: '#0a0a0f', color: '#a78bfa', padding: '1px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
