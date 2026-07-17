export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-4 text-sm text-slate-500">Ce module arrive dans une prochaine itération.</p>
    </div>
  )
}
