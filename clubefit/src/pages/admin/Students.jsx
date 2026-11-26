import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, traduzErro } from '../../lib'

const ROTULO = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }

export default function Students() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('role', 'student').order('full_name')
    if (error) setErro(traduzErro(error))
    setLista(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function alternar(p) {
    setErro('')
    const { error } = await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)
    if (error) setErro(traduzErro(error)); else carregar()
  }

  const termo = busca.trim().toLowerCase()
  const filtrada = lista.filter((p) =>
    !termo || [p.full_name, p.email, p.phone].some((v) => (v || '').toLowerCase().includes(termo)))

  return (
    <section>
      <h1>Alunos</h1>
      <label className="field">
        <span>Pesquisar por nome, e-mail ou telefone</span>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {carregando && <p className="muted">Carregando…</p>}
      {!carregando && filtrada.length === 0 && <p className="muted">Nenhum aluno encontrado.</p>}
      <div className="list">
        {filtrada.map((p) => {
          const status = p.status === 'approved' && !p.active ? 'Inativo' : p.status === 'approved' ? 'Ativo' : ROTULO[p.status]
          return (
            <article className="card item" key={p.id}>
              <button className="item-head" onClick={() => setAberto(aberto === p.id ? null : p.id)} aria-expanded={aberto === p.id}>
                <strong>{p.full_name || 'Sem nome'}</strong>
                <span className={`badge ${status.toLowerCase()}`}>{status}</span>
              </button>
              {aberto === p.id && (
                <div className="item-body">
                  <p className="muted">E-mail: {p.email}</p>
                  <p className="muted">Telefone: {p.phone || '—'}</p>
                  <p className="muted">Nascimento: {p.birth_date ? new Date(p.birth_date + 'T00:00').toLocaleDateString('pt-BR') : '—'}</p>
                  <p className="muted">Cadastro: {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  {p.status === 'approved' && (
                    <Link className="btn small" to={`/admin/alunos/${p.id}`}>Fichas de treino</Link>
                  )}
                  {p.status === 'approved' && (
                    <button className="btn ghost small" onClick={() => alternar(p)}>
                      {p.active ? 'Desativar aluno' : 'Ativar aluno'}
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
