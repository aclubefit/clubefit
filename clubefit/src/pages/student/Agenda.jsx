import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase, traduzErro, semanasConsecutivas, mmss } from '../../lib'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const chaveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Agenda() {
  const { profile } = useAuth()
  const [sessoes, setSessoes] = useState([])
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1) })
  const [sel, setSel] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('workout_sessions').select('*')
        .eq('student_id', profile.id).eq('status', 'completed').order('finished_at', { ascending: false }).limit(1000)
      if (error) setErro(traduzErro(error))
      setSessoes(data || []); setCarregando(false)
    })()
  }, [profile.id])

  const porDia = useMemo(() => {
    const m = {}
    sessoes.forEach((s) => { const k = chaveDia(new Date(s.finished_at)); (m[k] = m[k] || []).push(s) })
    return m
  }, [sessoes])

  if (carregando) return <p className="muted">Carregando…</p>

  const hoje = new Date()
  const ano = mes.getFullYear()
  const m = mes.getMonth()
  const diasNoMes = new Date(ano, m + 1, 0).getDate()
  const deslocamento = (mes.getDay() + 6) % 7
  const celulas = [...Array(deslocamento).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => new Date(ano, m, i + 1))]

  const doMes = sessoes.filter((s) => { const d = new Date(s.finished_at); return d.getFullYear() === ano && d.getMonth() === m })
  const diasTreinados = new Set(doMes.map((s) => chaveDia(new Date(s.finished_at)))).size
  const mesAtual = ano === hoje.getFullYear() && m === hoje.getMonth()
  const mesFuturo = mes > new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const decorridos = mesFuturo ? 0 : mesAtual ? hoje.getDate() : diasNoMes
  const freq = decorridos ? Math.round((diasTreinados / decorridos) * 100) : 0
  const semanas = semanasConsecutivas(sessoes.map((s) => new Date(s.finished_at)))

  const irMes = (delta) => { setSel(null); setMes(new Date(ano, m + delta, 1)) }
  const titulo = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const doDia = sel ? porDia[sel] || [] : []

  return (
    <section>
      <h1>Agenda</h1>
      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="stats tres">
        <div className="stat"><strong>{doMes.length}</strong><span>{doMes.length === 1 ? 'treino no mês' : 'treinos no mês'}</span></div>
        <div className="stat"><strong>{freq}%</strong><span>frequência ({diasTreinados} de {decorridos} dias)</span></div>
        <div className="stat"><strong>{semanas}</strong><span>{semanas === 1 ? 'semana seguida' : 'semanas seguidas'}</span></div>
      </div>

      <div className="cal-head">
        <button className="btn ghost small" onClick={() => irMes(-1)} aria-label="Mês anterior">←</button>
        <h2>{titulo}</h2>
        <button className="btn ghost small" onClick={() => irMes(1)} disabled={mesAtual || mesFuturo} aria-label="Próximo mês">→</button>
      </div>

      <div className="cal-grid" role="grid">
        {DIAS.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        {celulas.map((d, i) => {
          if (!d) return <div key={`v${i}`} />
          const k = chaveDia(d)
          const feito = !!porDia[k]
          const futuro = d > hoje && chaveDia(d) !== chaveDia(hoje)
          const classe = ['cal-day', feito ? 'feito' : futuro ? 'futuro' : 'sem', chaveDia(d) === chaveDia(hoje) ? 'hoje' : '', sel === k ? 'sel' : ''].join(' ')
          return (
            <button key={k} className={classe} onClick={() => setSel(sel === k ? null : k)}
              aria-label={`${d.getDate()}: ${feito ? 'treino concluído' : futuro ? 'dia futuro' : 'sem treino'}`}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
      <p className="muted legenda"><span className="dot feito" /> treino concluído <span className="dot sem" /> sem treino</p>

      {sel && (
        <article className="card">
          <strong>{new Date(sel + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
          {doDia.length === 0 && <p className="muted">Nenhum treino neste dia.</p>}
          {doDia.map((s) => (
            <p className="muted" key={s.id}>
              Ficha {s.plan_letter} — {s.plan_name} • {new Date(s.finished_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {s.duration_seconds != null ? ` • ${mmss(s.duration_seconds)}` : ''}
            </p>
          ))}
        </article>
      )}
    </section>
  )
}
