import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase, traduzErro, semanasConsecutivas } from '../../lib'

export default function Home() {
  const { profile } = useAuth()
  const [msgs, setMsgs] = useState([])
  const [lidas, setLidas] = useState(new Set())
  const [datas, setDatas] = useState([])
  const [aberto, setAberto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [m, r, s] = await Promise.all([
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('message_reads').select('message_id').eq('user_id', profile.id),
      supabase.from('workout_sessions').select('finished_at').eq('student_id', profile.id).eq('status', 'completed').order('finished_at', { ascending: false }).limit(400),
    ])
    const falha = m.error || r.error || s.error
    if (falha) setErro(traduzErro(falha))
    setMsgs(m.data || [])
    setLidas(new Set((r.data || []).map((x) => x.message_id)))
    setDatas((s.data || []).map((x) => new Date(x.finished_at)))
    setCarregando(false)
  }, [profile.id])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('mensagens-aluno')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [carregar])

  async function abrir(m) {
    const fechando = aberto === m.id
    setAberto(fechando ? null : m.id)
    if (fechando || lidas.has(m.id)) return
    setLidas(new Set([...lidas, m.id]))
    const { error } = await supabase.from('message_reads')
      .upsert({ message_id: m.id, user_id: profile.id }, { onConflict: 'message_id,user_id', ignoreDuplicates: true })
    if (error) { setErro(traduzErro(error)); carregar() }
  }

  const agora = new Date()
  const noMes = datas.filter((d) => d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()).length
  const semanas = semanasConsecutivas(datas)
  const naoLidas = msgs.filter((m) => !lidas.has(m.id)).length

  return (
    <section>
      <h1>Olá, {profile?.full_name?.split(' ')[0]}</h1>
      <div className="stats">
        <div className="stat"><strong>{noMes}</strong><span>treinos no mês</span></div>
        <div className="stat"><strong>{semanas}</strong><span>{semanas === 1 ? 'semana seguida' : 'semanas seguidas'}</span></div>
      </div>
      <Link className="btn ghost" to="/aluno/agenda">Abrir minha agenda</Link>
      <div className="row between">
        <h2>Avisos da academia</h2>
        {naoLidas > 0 && <span className="badge pendente">{naoLidas} {naoLidas === 1 ? 'nova' : 'novas'}</span>}
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {carregando && <p className="muted">Carregando…</p>}
      {!carregando && msgs.length === 0 && <p className="muted">Nenhum aviso por enquanto.</p>}
      <div className="list">
        {msgs.map((m) => {
          const nova = !lidas.has(m.id)
          return (
            <article className={nova ? 'card item msg unread' : 'card item msg'} key={m.id}>
              <button className="item-head" onClick={() => abrir(m)} aria-expanded={aberto === m.id}>
                <span>
                  <strong>{m.title}</strong>
                  <span className="muted block">
                    {m.kind === 'individual' ? 'Mensagem para você' : 'Aviso geral'} • {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                {nova && <span className="badge pendente">Nova</span>}
              </button>
              {aberto === m.id && <div className="item-body"><p className="msg-body">{m.body}</p></div>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
