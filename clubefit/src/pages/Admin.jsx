import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase, traduzErro } from '../lib'
import Logo from '../components/Logo'

export default function Admin() {
  const { profile, signOut } = useAuth()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
    if (error) setErro(traduzErro(error))
    setLista(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('perfis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [carregar])

  async function mudar(id, status) {
    setErro('')
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    if (error) setErro(traduzErro(error))
    else carregar()
  }
  async function excluir(id) {
    if (!window.confirm('Excluir esta solicitação?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) setErro(traduzErro(error))
    else carregar()
  }

  const pendentes = lista.filter((p) => p.status === 'pending')
  const aprovados = lista.filter((p) => p.status === 'approved')

  return (
    <div className="shell">
      <header className="top">
        <Logo small />
        <button className="btn ghost small" onClick={signOut}>Sair</button>
      </header>
      <section>
        <h1>Olá, {profile?.full_name?.split(' ')[0] || 'Administrador'}</h1>
        <div className="stats">
          <div className="stat"><strong>{lista.length}</strong><span>alunos cadastrados</span></div>
          <div className="stat"><strong>{pendentes.length}</strong><span>solicitações pendentes</span></div>
          <div className="stat"><strong>{aprovados.filter((p) => p.active).length}</strong><span>alunos ativos</span></div>
          <div className="stat"><strong>{aprovados.filter((p) => !p.active).length}</strong><span>alunos inativos</span></div>
        </div>
        <h2>Solicitações de cadastro</h2>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {carregando && <p className="muted">Carregando…</p>}
        {!carregando && pendentes.length === 0 && <p className="muted">Nenhuma solicitação pendente.</p>}
        {pendentes.map((p) => (
          <article className="card req" key={p.id}>
            <div>
              <strong>{p.full_name}</strong>
              <p className="muted">{p.email}</p>
              <p className="muted">{p.phone} {p.birth_date && `• nasc. ${new Date(p.birth_date + 'T00:00').toLocaleDateString('pt-BR')}`}</p>
            </div>
            <div className="row">
              <button className="btn small" onClick={() => mudar(p.id, 'approved')}>Aprovar</button>
              <button className="btn ghost small" onClick={() => mudar(p.id, 'rejected')}>Rejeitar</button>
              <button className="btn ghost small" onClick={() => excluir(p.id)}>Excluir</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
