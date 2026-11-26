import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'

export default function Student() {
  const { profile, signOut } = useAuth()
  return (
    <div className="shell">
      <header className="top">
        <Logo small />
        <button className="btn ghost small" onClick={signOut}>Sair</button>
      </header>
      <section>
        <h1>Olá, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="muted">Seu acesso está liberado. As abas Início, Aulas, Treino e Agenda chegam nas próximas etapas.</p>
      </section>
    </div>
  )
}
