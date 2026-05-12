interface Props {
  text: string
}

export default function ResultRenderer({ text }: Props) {
  if (!text) return null
  return <p className="text-sm whitespace-pre-wrap" style={{ color: '#cbd5e1' }}>{text}</p>
}
