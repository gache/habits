import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export interface TrendPoint {
  monthStr: string // "YYYY-MM"
  pct: number
}

interface TrendChartProps {
  points: TrendPoint[]
}

export default function TrendChart({ points }: TrendChartProps) {
  const chartData = points.map((p) => {
    const month = Number(p.monthStr.split('-')[1])
    return { label: MONTH_ABBR[month - 1], pct: p.pct }
  })

  return (
    <div className="bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-4 mb-6">
      <h2 className="font-sans font-extrabold text-base tracking-widest text-cream-800 dark:text-cream-100 mb-3">
        TENDENCIA (6 MESES)
      </h2>
      <div className="h-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dcc8" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a7550' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8a7550' }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Completado']} />
            <Line type="monotone" dataKey="pct" stroke="#457040" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Text alternative for screen readers (and what tests assert on) —
          the chart above is aria-hidden since this list carries the same
          information accessibly. */}
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.monthStr}>
            {p.monthStr}: {p.pct}%
          </li>
        ))}
      </ul>
    </div>
  )
}
