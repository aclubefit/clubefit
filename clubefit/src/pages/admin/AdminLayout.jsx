import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Logo from '../../components/Logo'

export default function AdminLayout() {
  const { signOut } = useAuth()
  return (
    <div className="shell has-nav">
      <header className="top">
        <Logo small />
        <button className="btn ghost small" onClick={signOut}>Sair</button>
      </header>
      <nav className="nav" aria-label="Menu do administrador">
        <NavLink to="/admin" end>Painel</NavLink>
        <NavLink to="/admin/alunos">Alunos</NavLink>
        <NavLink to="/admin/exercicios">Exercícios</NavLink>
        <NavLink to="/admin/mensagens">Mensagens</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
