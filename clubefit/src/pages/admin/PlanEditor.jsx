import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase, traduzErro } from '../../lib'
import { GRUPOS } from '../../grupos'
import { Midia } from './Exercises'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

export default function PlanEditor() {
  const { id, letra } = useParams()
  const nav = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [plano, setPlano] = useState({ name: '', muscle_group: '', instructor: '', notes: '' })
  const [itens, setItens] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [existe, setExiste] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    (async () => {
      const [a, lib, pl] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('id', id).maybeSingle(),
        supabase.from('exercises').select('id, name, muscle_group, media_url, media_type, suggested_sets, suggested_reps').order('name'),
        supabase.from('workout_plans').select('*').eq('student_id', id).eq('letter', letra).maybeSingle(),
      ])
      const falha = a.error || lib.error || pl.error
      if (falha) setErro(traduzErro(falha))
      setAluno(a.data); setBiblioteca(lib.data || [])
      if (pl.data) {
        setExiste(true)
        setPlano({ name: pl.data.name, muscle_group: pl.data.muscle_group || '', instructor: pl.data.instructor || '', notes: pl.data.notes || '' })
        const { data } = await supabase.from('workout_plan_items')
          .select('*, exercises(id, name, muscle_group, media_url, media_type)')
          .eq('plan_id', pl.data.id).order('position')
        setItens((data || []).map((i) => ({
          key: i.id, exercise_id: i.exercise_id, ex: i.exercises,
          sets: i.sets ?? '', reps: i.reps || '', load: i.load || '', rest_seconds: i.rest_seconds ?? '', notes: i.notes || '',
        })))
      }
      setCarregando(false)
    })()
  }, [id, letra])

  if (!LETRAS.includes(letra)) return <Navigate to={`/admin/alunos/${id}`} replace />
  if (carregando) return <p className="muted">Carregando…</p>
  if (!aluno) return <section><Link className="link left" to="/admin/alunos">← Voltar</Link><p className="muted">Aluno não encontrado.</p></section>

  const setP = (k) => (e) => setPlano({ ...plano, [k]: e.target.value })
  const setI = (key, k, v) => setItens(itens.map((i) => (i.key === key ? { ...i, [k]: v } : i)))

  function adicionar(ex) {
    setItens([...itens, {
      key: crypto.randomUUID(), exercise_id: ex.id, ex,
      sets: ex.suggested_sets ?? 3, reps: ex.suggested_reps || '', load: '', rest_seconds: 60, notes: '',
    }])
    setMostrar(false); setBusca('')
  }
  function mover(idx, dir) {
    const j = idx + dir
    if (j < 0 || j >= itens.length) return
    const novo = [...itens]
    ;[novo[idx], novo[j]] = [novo[j], novo[idx]]
    setItens(novo)
  }
  const remover = (key) => setItens(itens.filter((i) => i.key !== key))

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (itens.length === 0) return setErro('Adicione pelo menos um exercício à ficha.')
    setSalvando(true)
    const { error } = await supabase.rpc('save_workout_plan', {
      p_student: id, p_letter: letra,
      p_name: plano.name.trim(), p_group: plano.muscle_group.trim(),
      p_instructor: plano.instructor.trim(), p_notes: plano.notes.trim(),
      p_items: itens.map((i) => ({
        exercise_id: i.exercise_id, sets: i.sets === '' ? '' : String(i.sets), reps: i.reps.trim(),
        load: i.load.trim(), rest_seconds: i.rest_seconds === '' ? '' : String(i.rest_seconds), notes: i.notes.trim(),
      })),
    })
    setSalvando(false)
    if (error) return setErro(traduzErro(error))
    nav(`/admin/alunos/${id}`)
  }

  async function excluir() {
    if (!window.confirm(`Excluir a Ficha ${letra} deste aluno? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.from('workout_plans').delete().eq('student_id', id).eq('letter', letra)
    if (error) return setErro(traduzErro(error))
    nav(`/admin/alunos/${id}`)
  }

  const termo = busca.trim().toLowerCase()
  const resultados = biblioteca
    .filter((x) => (!grupo || x.muscle_group === grupo) && (!termo || x.name.toLowerCase().includes(termo)))
    .slice(0, 40)

  return (
    <section>
      <Link className="link left" to={`/admin/alunos/${id}`}>← Voltar para {aluno.full_name.split(' ')[0]}</Link>
      <h1>Ficha {letra}</h1>
      <form className="card" onSubmit={salvar}>
        <label className="field"><span>Nome do treino</span>
          <input required minLength={2} maxLength={120} placeholder="Ex.: Peito e tríceps" value={plano.name} onChange={setP('name')} /></label>
        <label className="field"><span>Grupo muscular</span>
          <input list="grupos" maxLength={120} value={plano.muscle_group} onChange={setP('muscle_group')} />
          <datalist id="grupos">{GRUPOS.map((g) => <option key={g} value={g} />)}</datalist></label>
        <label className="field"><span>Professor responsável</span>
          <input maxLength={120} value={plano.instructor} onChange={setP('instructor')} /></label>
        <label className="field"><span>Orientações gerais da ficha</span>
          <textarea rows={2} maxLength={1000} value={plano.notes} onChange={setP('notes')} /></label>

        <h2>Exercícios ({itens.length})</h2>
        {itens.length === 0 && <p className="muted">Nenhum exercício ainda. Toque em "Adicionar exercício".</p>}
        {itens.map((it, idx) => (
          <div className="plan-item" key={it.key}>
            <div className="plan-head">
              <div className="thumb"><Midia ex={it.ex} /></div>
              <div>
                <strong>{idx + 1}. {it.ex?.name}</strong>
                <p className="muted">{it.ex?.muscle_group}</p>
              </div>
            </div>
            <div className="row2">
              <label className="field"><span>Séries</span>
                <input type="number" min="1" max="20" value={it.sets} onChange={(e) => setI(it.key, 'sets', e.target.value)} /></label>
              <label className="field"><span>Repetições</span>
                <input maxLength={20} placeholder="10 a 12" value={it.reps} onChange={(e) => setI(it.key, 'reps', e.target.value)} /></label>
              <label className="field"><span>Carga sugerida</span>
                <input maxLength={40} placeholder="Ex.: 20 kg" value={it.load} onChange={(e) => setI(it.key, 'load', e.target.value)} /></label>
              <label className="field"><span>Descanso (segundos)</span>
                <input type="number" min="0" max="900" value={it.rest_seconds} onChange={(e) => setI(it.key, 'rest_seconds', e.target.value)} /></label>
            </div>
            <label className="field"><span>Orientações deste exercício</span>
              <textarea rows={2} maxLength={500} value={it.notes} onChange={(e) => setI(it.key, 'notes', e.target.value)} /></label>
            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => mover(idx, -1)} disabled={idx === 0}>Subir</button>
              <button type="button" className="btn ghost small" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1}>Descer</button>
              <button type="button" className="btn ghost small" onClick={() => remover(it.key)}>Remover</button>
            </div>
          </div>
        ))}

        {!mostrar && <button type="button" className="btn ghost" onClick={() => setMostrar(true)}>Adicionar exercício</button>}
        {mostrar && (
          <div className="picker">
            <label className="field"><span>Pesquisar na biblioteca</span>
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
            <label className="field"><span>Grupo muscular</span>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="">Todos</option>
                {GRUPOS.map((g) => <option key={g}>{g}</option>)}
              </select></label>
            {resultados.length === 0 && <p className="muted">Nenhum exercício encontrado.</p>}
            {resultados.map((x) => (
              <button type="button" key={x.id} className="pick" onClick={() => adicionar(x)}>
                <strong>{x.name}</strong><span className="muted">{x.muscle_group}</span>
              </button>
            ))}
            <button type="button" className="btn ghost small" onClick={() => setMostrar(false)}>Fechar lista</button>
          </div>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar ficha'}</button>
        {existe && <button type="button" className="btn ghost" onClick={excluir} disabled={salvando}>Excluir ficha {letra}</button>}
      </form>
    </section>
  )
}
