import { useCallback, useEffect, useState } from 'react'
import { supabase, traduzErro } from '../../lib'

const ASSUNTOS = ['Aviso de feriado', 'Mudança de horário', 'Aviso de funcionamento', 'Comunicado geral', 'Mensalidade em atraso']

export default function Messages() {
  const [alunos, setAlunos] = useState([])
  const [msgs, setMsgs] = useState([])
  const [leituras, setLeituras] = useState([])
  const [tipo, setTipo] = useState('todos')
  const [alunoId, setAlunoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  const carregar = useCallback(async () => {
    const [a, m] = await Promise.all([
      supabase.from('profiles').select('id, full_name, status, active').eq('role', 'student').order('full_name'),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    if (a.error || m.error) setErro(traduzErro(a.error || m.error))
    setAlunos(a.data || [])
    setMsgs(m.data || [])
    const ids = (m.data || []).map((x) => x.id)
    if (ids.length) {
      const r = await supabase.from('message_reads').select('message_id, user_id').in('message_id', ids)
      setLeituras(r.data || [])
    } else setLeituras([])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const ativos = alunos.filter((a) => a.status === 'approved' && a.active)
  const nome = (id) => alunos.find((a) => a.id === id)?.full_name || 'Aluno'

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setOk('')
    if (tipo === 'aluno' && !alunoId) return setErro('Escolha o aluno que vai receber a mensagem.')
    setEnviando(true)
    const { error } = await supabase.from('messages').insert({
      kind: tipo === 'todos' ? 'broadcast' : 'individual',
      recipient_id: tipo === 'todos' ? null : alunoId,
      title: titulo.trim(), body: texto.trim(),
    })
    setEnviando(false)
    if (error) return setErro(traduzErro(error))
    setTitulo(''); setTexto('')
    setOk(tipo === 'todos' ? 'Mensagem enviada para todos os alunos.' : `Mensagem enviada para ${nome(alunoId)}.`)
    carregar()
  }

  async function excluir(m) {
    if (!window.confirm('Excluir esta mensagem? Ela some para os alunos também.')) return
    const { error } = await supabase.from('messages').delete().eq('id', m.id)
    if (error) setErro(traduzErro(error)); else carregar()
  }

  function situacao(m) {
    const lidas = leituras.filter((l) => l.message_id === m.id)
    if (m.kind === 'individual') return lidas.length ? 'Lida' : 'Não lida'
    return `${lidas.length} de ${ativos.length} leram`
  }

  return (
    <section>
      <h1>Mensagens</h1>
      <form className="card" onSubmit={enviar}>
        <label className="field"><span>Enviar para</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos os alunos</option>
            <option value="aluno">Um aluno</option>
          </select></label>
        {tipo === 'aluno' && (
          <label className="field"><span>Aluno</span>
            <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
              <option value="">Selecione</option>
              {ativos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select></label>
        )}
        <div className="chips" aria-label="Assuntos rápidos">
          {ASSUNTOS.map((a) => <button type="button" key={a} className="chip" onClick={() => setTitulo(a)}>{a}</button>)}
        </div>
        <label className="field"><span>Título</span>
          <input required minLength={2} maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
        <label className="field"><span>Mensagem</span>
          <textarea required rows={5} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button className="btn" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensagem'}</button>
      </form>

      <h2>Enviadas</h2>
      {msgs.length === 0 && <p className="muted">Nenhuma mensagem enviada ainda.</p>}
      <div className="list">
        {msgs.map((m) => (
          <article className="card" key={m.id}>
            <div className="row between">
              <strong>{m.title}</strong>
              <span className="badge">{situacao(m)}</span>
            </div>
            <p className="muted">
              {m.kind === 'broadcast' ? 'Todos os alunos' : `Para ${nome(m.recipient_id)}`} • {new Date(m.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="msg-body">{m.body}</p>
            <button className="btn ghost small" onClick={() => excluir(m)}>Excluir</button>
          </article>
        ))}
      </div>
    </section>
  )
}
