import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase, traduzErro, inicioDaSemana, mmss } from '../../lib'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function Workouts() {
  const { profile } = useAuth()
  const [planos, setPlanos] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([
        supabase.from('workout_plans').select('*, workout_plan_items(count)').eq('student_id', profile.id).order('letter'),
        supabase.from('workout_sessions').select('*').eq('student_id', profile.id).in('status', ['completed', 'in_progress']).order('started_at', { ascending: false }).limit(60),
      ])
      if (p.error || s.error) setErro(traduzErro(p.error || s.error))
      setPlanos(p.data || []); setSessoes(s.data || []); setCarregando(false)
    })()
  }, [profile.id])

  if (carregando) return <p className="muted">Carregando…</p>

  const concluidas = sessoes.filter((s) => s.status === 'completed')
  const inicio = inicioDaSemana(new Date())
  const hoje = new Date().toDateString()
  const semana = DIAS.map((nome, i) => {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i)
    return { nome, feito: concluidas.some((s) => new Date(s.finished_at).toDateString() === d.toDateString()), hoje: d.toDateString() === hoje }
  })

  const letras = planos.map((p) => p.letter)
  const ultima = concluidas[0]
  const idx = ultima ? letras.indexOf(ultima.plan_letter) : -1
  const sugerida = planos.find((p) => p.letter === letras[(idx + 1) % letras.length]) || null
  const emAndamento = (letra) => sessoes.some((s) => s.status === 'in_progress' && s.plan_letter === letra)

  return (
    <section>
      <h1>Treino</h1>
      {erro && <p className="erro" role="alert">{erro}</p>}

      <h2>Treinos na semana</h2>
      <div className="week">
        {semana.map((d) => (
          <div key={d.nome} className={`day${d.feito ? ' feito' : ''}${d.hoje ? ' hoje' : ''}`}>
            <span>{d.nome}</span>
            <strong>{d.feito ? '✓' : '·'}</strong>
          </div>
        ))}
      </div>

      {planos.length === 0 && (
        <p className="muted">Você ainda não tem ficha de treino. Procure o professor para montar a sua.</p>
      )}

      {sugerida && (
        <>
          <h2>Treino do dia</h2>
          <article className="card">
            <strong>Ficha {sugerida.letter} — {sugerida.name}</strong>
            <p className="muted">
              {sugerida.muscle_group || ''}{sugerida.muscle_group && sugerida.instructor ? ' • ' : ''}{sugerida.instructor ? `Prof. ${sugerida.instructor}` : ''}
            </p>
            <p className="muted">{emAndamento(sugerida.letter) ? 'Treino em andamento' : ultima ? 'Próxima ficha da sequência' : 'Sua primeira ficha'}</p>
            <Link className="btn" to={`/aluno/treino/${sugerida.letter}`}>{emAndamento(sugerida.letter) ? 'Continuar treino' : 'Iniciar treino'}</Link>
          </article>
        </>
      )}

      {planos.length > 1 && (
        <>
          <h2>Minhas fichas</h2>
          <div className="list">
            {planos.map((p) => {
              const qtd = p.workout_plan_items?.[0]?.count ?? 0
              return (
                <article className="card" key={p.id}>
                  <strong>Ficha {p.letter} — {p.name}</strong>
                  <p className="muted">{qtd} {qtd === 1 ? 'exercício' : 'exercícios'}</p>
                  <Link className="btn ghost small" to={`/aluno/treino/${p.letter}`}>{emAndamento(p.letter) ? 'Continuar' : 'Ver ficha'}</Link>
                </article>
              )
            })}
          </div>
        </>
      )}

      <h2>Histórico de treinos</h2>
      {concluidas.length === 0 && <p className="muted">Nenhum treino concluído ainda.</p>}
      <div className="list">
        {concluidas.slice(0, 20).map((s) => (
          <article className="card" key={s.id}>
            <strong>Ficha {s.plan_letter} — {s.plan_name}</strong>
            <p className="muted">
              {new Date(s.finished_at).toLocaleDateString('pt-BR')} às {new Date(s.finished_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {s.duration_seconds != null ? ` • ${mmss(s.duration_seconds)}` : ''}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
