import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase, traduzErro, mmss } from '../../lib'
import { Midia } from '../admin/Exercises'

function avisar() {
  try {
    navigator.vibrate?.([200, 100, 200])
    const C = window.AudioContext || window.webkitAudioContext
    const ctx = new C()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.2, ctx.currentTime)
    o.start(); o.stop(ctx.currentTime + 0.6)
  } catch { /* sem som neste aparelho */ }
}

const chave = (itemId, n) => `${itemId}:${n}`

export default function Workout() {
  const { letra } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const [plano, setPlano] = useState(null)
  const [itens, setItens] = useState([])
  const [sessao, setSessao] = useState(null)
  const [logs, setLogs] = useState({})
  const [editando, setEditando] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(Date.now())
  const [rest, setRestState] = useState(null) // { remaining, running, endAt, finished }
  const restRef = useRef(null)
  const setRest = (v) => { restRef.current = v; setRestState(v) }

  const carregar = useCallback(async () => {
    const { data: p, error: e1 } = await supabase.from('workout_plans').select('*')
      .eq('student_id', profile.id).eq('letter', letra).maybeSingle()
    if (e1) setErro(traduzErro(e1))
    setPlano(p)
    if (p) {
      const { data: its } = await supabase.from('workout_plan_items').select('*, exercises(*)')
        .eq('plan_id', p.id).order('position')
      setItens(its || [])
      const { data: s } = await supabase.from('workout_sessions').select('*')
        .eq('plan_id', p.id).eq('student_id', profile.id).eq('status', 'in_progress')
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      setSessao(s)
      if (s) {
        const { data: ls } = await supabase.from('workout_set_logs').select('*').eq('session_id', s.id)
        const mapa = {}
        ;(ls || []).forEach((l) => { mapa[chave(l.plan_item_id, l.set_number)] = { reps: l.reps || '', weight: l.weight || '', notes: l.notes || '', done: l.done, done_at: l.done_at } })
        setLogs(mapa)
      }
    }
    setCarregando(false)
  }, [profile.id, letra])
  useEffect(() => { carregar() }, [carregar])

  // cronômetro geral
  useEffect(() => {
    if (!sessao) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sessao])

  // contagem regressiva do descanso
  useEffect(() => {
    if (!rest?.running) return
    const t = setInterval(() => {
      const r = restRef.current
      if (!r || !r.running) return
      const rem = Math.max(0, Math.ceil((r.endAt - Date.now()) / 1000))
      if (rem <= 0) { avisar(); setRest({ ...r, remaining: 0, running: false, finished: true }) }
      else if (rem !== r.remaining) setRest({ ...r, remaining: rem })
    }, 250)
    return () => clearInterval(t)
  }, [rest?.running])

  async function iniciar() {
    setErro(''); setOcupado(true)
    const { data, error } = await supabase.from('workout_sessions').insert({
      student_id: profile.id, plan_id: plano.id, plan_letter: plano.letter, plan_name: plano.name,
    }).select().single()
    setOcupado(false)
    if (error) return setErro(traduzErro(error))
    setLogs({}); setSessao(data)
  }

  async function registrar(item, n, patch) {
    const k = chave(item.id, n)
    const atual = { ...(logs[k] || {}), ...patch }
    setLogs((prev) => ({ ...prev, [k]: atual }))
    const { error } = await supabase.from('workout_set_logs').upsert({
      session_id: sessao.id, plan_item_id: item.id, exercise_name: item.exercises?.name || null, set_number: n,
      reps: (atual.reps || '').trim() || null, weight: (atual.weight || '').trim() || null, notes: (atual.notes || '').trim() || null,
      done: !!atual.done, done_at: atual.done ? (atual.done_at || new Date().toISOString()) : null,
    }, { onConflict: 'session_id,plan_item_id,set_number' })
    if (error) setErro(traduzErro(error))
  }

  function marcar(item, n) {
    const feita = !!logs[chave(item.id, n)]?.done
    registrar(item, n, { done: !feita, done_at: feita ? null : new Date().toISOString() })
    const seg = item.rest_seconds ?? 60
    if (!feita && seg > 0) setRest({ remaining: seg, running: true, endAt: Date.now() + seg * 1000, finished: false })
  }

  function ajustarDescanso(delta) {
    const r = restRef.current
    if (!r) return
    if (r.running) {
      const endAt = Math.max(Date.now() + 5000, r.endAt + delta * 1000)
      setRest({ ...r, endAt, remaining: Math.ceil((endAt - Date.now()) / 1000) })
    } else setRest({ ...r, remaining: Math.max(5, r.remaining + delta), finished: false })
  }
  function pausarOuContinuar() {
    const r = restRef.current
    if (!r) return
    if (r.running) setRest({ ...r, running: false })
    else setRest({ ...r, running: true, finished: false, endAt: Date.now() + r.remaining * 1000 })
  }

  const totalSeries = itens.reduce((s, i) => s + (i.sets ?? 3), 0)
  const feitas = Object.values(logs).filter((l) => l.done).length

  async function concluir() {
    const aviso = feitas === 0
      ? 'Nenhuma série foi marcada. Deseja encerrar e registrar este treino mesmo assim?'
      : feitas < totalSeries ? `Ainda faltam ${totalSeries - feitas} séries. Deseja encerrar e registrar o treino mesmo assim?` : null
    if (aviso && !window.confirm(aviso)) return
    setOcupado(true)
    const fim = new Date()
    const { error } = await supabase.from('workout_sessions').update({
      status: 'completed', finished_at: fim.toISOString(),
      duration_seconds: Math.max(0, Math.round((fim - new Date(sessao.started_at)) / 1000)),
    }).eq('id', sessao.id)
    setOcupado(false)
    if (error) return setErro(traduzErro(error))
    nav('/aluno/treino')
  }

  async function descartar() {
    if (!window.confirm('Descartar este treino? Ele não será registrado no histórico.')) return
    const { error } = await supabase.from('workout_sessions').update({ status: 'cancelled' }).eq('id', sessao.id)
    if (error) return setErro(traduzErro(error))
    nav('/aluno/treino')
  }

  if (carregando) return <p className="muted">Carregando…</p>
  if (!plano) {
    return (
      <section>
        <Link className="link left" to="/aluno/treino">← Voltar</Link>
        <p className="muted">Ficha não encontrada.</p>
      </section>
    )
  }

  const decorrido = sessao ? (agora - new Date(sessao.started_at).getTime()) / 1000 : 0

  return (
    <section>
      <Link className="link left" to="/aluno/treino">← Voltar para treinos</Link>
      <h1>Ficha {plano.letter} — {plano.name}</h1>
      <p className="muted">{plano.muscle_group || ''}{plano.instructor ? ` • Prof. ${plano.instructor}` : ''}</p>
      {plano.notes && <p className="msg-body muted">{plano.notes}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}

      {sessao && (
        <div className="timer-bar" role="timer">
          <div><span className="muted">Tempo total</span><strong>{mmss(decorrido)}</strong></div>
          <div><span className="muted">Séries</span><strong>{feitas}/{totalSeries}</strong></div>
        </div>
      )}

      {sessao && rest && (
        <div className={rest.finished ? 'rest done' : 'rest'} role="status">
          <div>
            <span className="muted">{rest.finished ? 'Descanso terminado' : rest.running ? 'Descansando' : 'Descanso pausado'}</span>
            <strong>{mmss(rest.remaining)}</strong>
          </div>
          <div className="row">
            {!rest.finished && <button className="btn ghost small" onClick={pausarOuContinuar}>{rest.running ? 'Pausar' : 'Continuar'}</button>}
            {!rest.finished && <button className="btn ghost small" onClick={() => ajustarDescanso(-15)}>−15 s</button>}
            {!rest.finished && <button className="btn ghost small" onClick={() => ajustarDescanso(15)}>+15 s</button>}
            <button className="btn small" onClick={() => setRest(null)}>{rest.finished ? 'Fechar' : 'Pular'}</button>
          </div>
        </div>
      )}

      {itens.length === 0 && <p className="muted">Esta ficha ainda não tem exercícios.</p>}
      <div className="list one">
        {itens.map((it, idx) => {
          const sets = it.sets ?? 3
          const ex = it.exercises
          return (
            <article className="card" key={it.id}>
              <Midia ex={ex} />
              <strong>{idx + 1}. {ex?.name}</strong>
              <p className="muted">
                {ex?.muscle_group} • {sets} séries{it.reps ? ` de ${it.reps}` : ''}{it.load ? ` • ${it.load}` : ''}{it.rest_seconds ? ` • descanso ${it.rest_seconds}s` : ''}
              </p>
              {it.notes && <p className="msg-body muted">{it.notes}</p>}
              {sessao && Array.from({ length: sets }, (_, i) => i + 1).map((n) => {
                const l = logs[chave(it.id, n)] || {}
                const aberto = editando === chave(it.id, n)
                return (
                  <div className={l.done ? 'set done' : 'set'} key={n}>
                    <div className="set-row">
                      <button className="set-btn" aria-pressed={!!l.done} aria-label={`Série ${n} ${l.done ? 'concluída' : 'pendente'}`} onClick={() => marcar(it, n)}>{l.done ? '✓' : n}</button>
                      <span>Série {n}{l.reps || l.weight ? ` • ${l.reps ? `${l.reps} reps` : ''}${l.reps && l.weight ? ' • ' : ''}${l.weight || ''}` : ''}</span>
                      <button className="btn ghost small" onClick={() => setEditando(aberto ? null : chave(it.id, n))}>{aberto ? 'Fechar' : 'Editar'}</button>
                    </div>
                    {aberto && (
                      <div className="set-edit">
                        <div className="row2">
                          <label className="field"><span>Repetições feitas</span>
                            <input maxLength={20} value={l.reps || ''} onChange={(e) => setLogs({ ...logs, [chave(it.id, n)]: { ...l, reps: e.target.value } })} /></label>
                          <label className="field"><span>Peso usado</span>
                            <input maxLength={20} placeholder="Ex.: 20 kg" value={l.weight || ''} onChange={(e) => setLogs({ ...logs, [chave(it.id, n)]: { ...l, weight: e.target.value } })} /></label>
                        </div>
                        <label className="field"><span>Observações</span>
                          <input maxLength={500} value={l.notes || ''} onChange={(e) => setLogs({ ...logs, [chave(it.id, n)]: { ...l, notes: e.target.value } })} /></label>
                        <button className="btn small" onClick={() => { registrar(it, n, {}); setEditando(null) }}>Salvar série</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </article>
          )
        })}
      </div>

      {!sessao && itens.length > 0 && <button className="btn" onClick={iniciar} disabled={ocupado}>{ocupado ? 'Iniciando…' : 'Iniciar treino'}</button>}
      {sessao && (
        <div className="list one">
          <button className="btn" onClick={concluir} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Concluir treino'}</button>
          <button className="btn ghost" onClick={descartar} disabled={ocupado}>Descartar treino</button>
        </div>
      )}
    </section>
  )
}
