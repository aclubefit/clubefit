import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, traduzErro } from '../../lib'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

export default function StudentDetail() {
  const { id } = useParams()
  const [aluno, setAluno] = useState(null)
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('workout_plans').select('*, workout_plan_items(count)').eq('student_id', id),
      ])
      if (a.error || p.error) setErro(traduzErro(a.error || p.error))
      setAluno(a.data); setPlanos(p.data || []); setCarregando(false)
    })()
  }, [id])

  if (carregando) return <p className="muted">Carregando…</p>
  if (!aluno) return <section><Link className="link" to="/admin/alunos">← Voltar</Link><p className="muted">Aluno não encontrado.</p></section>

  return (
    <section>
      <Link className="link left" to="/admin/alunos">← Voltar para alunos</Link>
      <h1>{aluno.full_name}</h1>
      <p className="muted">Fichas de treino. Tudo que você salvar aparece automaticamente na conta do aluno. Você escolhe quantas fichas ele terá.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="list">
        {LETRAS.map((l) => {
          const p = planos.find((x) => x.letter === l)
          const qtd = p?.workout_plan_items?.[0]?.count ?? 0
          return (
            <article className="card" key={l}>
              <strong>Ficha {l}</strong>
              {p ? (
                <>
                  <p className="muted">{p.name}{p.muscle_group ? ` • ${p.muscle_group}` : ''}</p>
                  <p className="muted">{qtd} {qtd === 1 ? 'exercício' : 'exercícios'}{p.instructor ? ` • Prof. ${p.instructor}` : ''}</p>
                </>
              ) : <p className="muted">Não cadastrada.</p>}
              <Link className="btn ghost small" to={`/admin/alunos/${id}/ficha/${l}`}>{p ? 'Editar ficha' : 'Criar ficha'}</Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
