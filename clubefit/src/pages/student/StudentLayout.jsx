import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Logo from '../../components/Logo'

export default function StudentLayout() {
  const { signOut } = useAuth()
  return (
    <div className="shell">
      <header className="top">
        <Logo small />
        <button className="btn ghost small" onClick={signOut}>Sair</button>
      </header>
      <nav className="nav" aria-label="Menu do aluno">
        <NavLink to="/aluno" end>Início</NavLink>
        <NavLink to="/aluno/treino">Treino</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
