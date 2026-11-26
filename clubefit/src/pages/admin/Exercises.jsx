import { useCallback, useEffect, useState } from 'react'
import { supabase, traduzErro } from '../../lib'
import { GRUPOS } from '../../grupos'

const BUCKET = 'exercicios'
const MAX_MB = 50
const VAZIO = { name: '', muscle_group: GRUPOS[0], muscles: '', description: '', instructions: '', suggested_sets: '', suggested_reps: '' }

function caminhoDaMidia(url) {
  const i = url?.indexOf(`/${BUCKET}/`)
  return i > -1 ? decodeURIComponent(url.slice(i + BUCKET.length + 2)) : null
}

export function Midia({ ex }) {
  if (!ex.media_url) return <div className="media vazio">Sem demonstração</div>
  if (ex.media_type === 'video') return <video className="media" src={ex.media_url} controls muted playsInline preload="metadata" />
  return <img className="media" src={ex.media_url} alt={`Demonstração: ${ex.name}`} loading="lazy" />
}

export default function Exercises() {
  const [lista, setLista] = useState([])
  const [grupo, setGrupo] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null) // null = fechado
  const [arquivo, setArquivo] = useState(null)
  const [removerMidia, setRemoverMidia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('exercises').select('*').order('name')
    if (error) setErro(traduzErro(error))
    setLista(data || [])
    setCarregando(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const termo = busca.trim().toLowerCase()
  const filtrada = lista.filter((e) =>
    (grupo === 'Todos' || e.muscle_group === grupo) &&
    (!termo || e.name.toLowerCase().includes(termo) || (e.muscles || '').toLowerCase().includes(termo)))

  function abrir(ex) {
    setErro(''); setArquivo(null); setRemoverMidia(false)
    setForm(ex ? { ...ex, suggested_sets: ex.suggested_sets ?? '', suggested_reps: ex.suggested_reps ?? '' } : { ...VAZIO })
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function escolherArquivo(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) { setErro(`O arquivo passa de ${MAX_MB} MB. Escolha um menor.`); e.target.value = ''; return }
    setErro(''); setArquivo(f); setRemoverMidia(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro(''); setSalvando(true)
    try {
      let media_url = form.media_url || null
      let media_type = form.media_type || null
      const antiga = caminhoDaMidia(form.media_url)

      if (arquivo) {
        const ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, arquivo, { contentType: arquivo.type })
        if (upErr) throw upErr
        media_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
        media_type = arquivo.type === 'image/gif' ? 'gif' : arquivo.type.startsWith('video') ? 'video' : 'image'
      } else if (removerMidia) {
        media_url = null; media_type = null
      }

      const dados = {
        name: form.name.trim(),
        muscle_group: form.muscle_group,
        muscles: form.muscles.trim() || null,
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        suggested_sets: form.suggested_sets === '' ? null : Number(form.suggested_sets),
        suggested_reps: String(form.suggested_reps).trim() || null,
        media_url, media_type,
      }
      const { error } = form.id
        ? await supabase.from('exercises').update(dados).eq('id', form.id)
        : await supabase.from('exercises').insert(dados)
      if (error) throw error

      if (antiga && (arquivo || removerMidia)) await supabase.storage.from(BUCKET).remove([antiga])
      setForm(null)
      carregar()
    } catch (err) {
      setErro(traduzErro(err))
    }
    setSalvando(false)
  }

  async function excluir(ex) {
    if (!window.confirm(`Excluir "${ex.name}"? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.from('exercises').delete().eq('id', ex.id)
    if (error) return setErro(traduzErro(error))
    const p = caminhoDaMidia(ex.media_url)
    if (p) await supabase.storage.from(BUCKET).remove([p])
    carregar()
  }

  if (form) {
    return (
      <section>
        <h1>{form.id ? 'Editar exercício' : 'Novo exercício'}</h1>
        <form className="card" onSubmit={salvar}>
          <label className="field"><span>Nome</span>
            <input required minLength={2} maxLength={120} value={form.name} onChange={set('name')} /></label>
          <label className="field"><span>Grupo muscular</span>
            <select value={form.muscle_group} onChange={set('muscle_group')}>
              {GRUPOS.map((g) => <option key={g}>{g}</option>)}
            </select></label>
          <label className="field"><span>Músculos trabalhados</span>
            <input value={form.muscles} onChange={set('muscles')} /></label>
          <label className="field"><span>Descrição</span>
            <textarea rows={3} value={form.description} onChange={set('description')} /></label>
          <label className="field"><span>Orientações de execução</span>
            <textarea rows={4} value={form.instructions} onChange={set('instructions')} /></label>
          <div className="row2">
            <label className="field"><span>Séries sugeridas</span>
              <input type="number" min="1" max="20" value={form.suggested_sets} onChange={set('suggested_sets')} /></label>
            <label className="field"><span>Repetições sugeridas</span>
              <input maxLength={20} placeholder="Ex.: 10 a 12" value={form.suggested_reps} onChange={set('suggested_reps')} /></label>
          </div>

          <div className="field">
            <span>Demonstração (foto, GIF ou vídeo, até {MAX_MB} MB)</span>
            {!arquivo && !removerMidia && form.media_url && <Midia ex={form} />}
            {arquivo && <p className="ok">Novo arquivo: {arquivo.name}</p>}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={escolherArquivo} />
            {form.media_url && !arquivo && (
              <label className="check"><input type="checkbox" checked={removerMidia} onChange={(e) => setRemoverMidia(e.target.checked)} /> Remover demonstração atual</label>
            )}
          </div>

          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar exercício'}</button>
          <button type="button" className="btn ghost" onClick={() => setForm(null)} disabled={salvando}>Cancelar</button>
        </form>
      </section>
    )
  }

  return (
    <section>
      <div className="row between">
        <h1>Exercícios</h1>
        <button className="btn small" onClick={() => abrir(null)}>Novo exercício</button>
      </div>
      <label className="field"><span>Pesquisar exercício ou músculo</span>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
      <div className="chips" role="tablist" aria-label="Grupo muscular">
        {['Todos', ...GRUPOS].map((g) => (
          <button key={g} className={g === grupo ? 'chip on' : 'chip'} onClick={() => setGrupo(g)}>{g}</button>
        ))}
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {carregando && <p className="muted">Carregando…</p>}
      {!carregando && filtrada.length === 0 && <p className="muted">Nenhum exercício encontrado.</p>}
      <div className="list">
        {filtrada.map((ex) => (
          <article className="card ex" key={ex.id}>
            <Midia ex={ex} />
            <div>
              <strong>{ex.name}</strong>
              <p className="muted">{ex.muscle_group}{ex.muscles ? ` • ${ex.muscles}` : ''}</p>
              {(ex.suggested_sets || ex.suggested_reps) && (
                <p className="muted">Sugestão: {ex.suggested_sets ? `${ex.suggested_sets} séries` : ''}{ex.suggested_sets && ex.suggested_reps ? ' de ' : ''}{ex.suggested_reps || ''}</p>
              )}
              {ex.instructions && <p className="instr">{ex.instructions}</p>}
            </div>
            <div className="row">
              <button className="btn ghost small" onClick={() => abrir(ex)}>Editar</button>
              <button className="btn ghost small" onClick={() => excluir(ex)}>Excluir</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
