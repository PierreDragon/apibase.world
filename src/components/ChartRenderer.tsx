import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

interface Series {
  key: string
  label: string
  color?: string
}

interface ChartSpec {
  type: 'bar' | 'line' | 'area' | 'pie'
  title?: string
  xKey?: string
  series?: Series[]
  data: Record<string, unknown>[]
}

const PALETTE = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899']

const tooltipStyle = {
  backgroundColor: '#12121a',
  border: '1px solid #1e1e2e',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.75rem',
}

const axisStyle = { fill: '#475569', fontSize: 11 }

export default function ChartRenderer({ raw }: { raw: string }) {
  let spec: ChartSpec
  try {
    spec = JSON.parse(raw.trim())
  } catch {
    return <pre className="text-xs" style={{ color: '#f87171' }}>{raw}</pre>
  }

  const { type, title, xKey = 'name', series = [], data } = spec

  if (!Array.isArray(data) || data.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '0.8rem' }}>No data.</p>
  }

  const resolvedSeries: Series[] = series.length > 0
    ? series
    : Object.keys(data[0])
        .filter(k => k !== xKey)
        .map((k, i) => ({ key: k, label: k, color: PALETTE[i % PALETTE.length] }))

  return (
    <div className="my-4">
      {title && (
        <p className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>{title}</p>
      )}

      {type === 'pie' ? (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={120} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#64748b' }} />
          </PieChart>
        </ResponsiveContainer>

      ) : type === 'line' ? (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            {resolvedSeries.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#64748b' }} />}
            {resolvedSeries.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={s.color ?? PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>

      ) : type === 'area' ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <defs>
              {resolvedSeries.map((s, i) => (
                <linearGradient key={s.key} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            {resolvedSeries.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#64748b' }} />}
            {resolvedSeries.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={s.color ?? PALETTE[i % PALETTE.length]} strokeWidth={2}
                fill={`url(#grad_${i})`} />
            ))}
          </AreaChart>
        </ResponsiveContainer>

      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            {resolvedSeries.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#64748b' }} />}
            {resolvedSeries.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label}
                fill={s.color ?? PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
