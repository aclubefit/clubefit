import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import { Recover, Reset } from './pages/Recover'
import Waiting from './pages/Waiting'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Students from './pages/admin/Students'
import Exercises from './pages/admin/Exercises'
import StudentDetail from './pages/admin/StudentDetail'
import PlanEditor from './pages/admin/PlanEditor'
import Messages from './pages/admin/Messages'
import StudentLayout from './pages/student/StudentLayout'
import Home from './pages/student/Home'
import Workouts from './pages/student/Workouts'
import Workout from './pages/student/Workout'

const Loading = () => <div className="center" role="status">Carregando…</div>

function destino(profile) {
  if (profile?.status === 'approved' && profile.active) return profile.role === 'admin' ? '/admin' : '/aluno'
  return '/aguardando'
}

function Home() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={destino(profile)} replace />
}

function Guard({ role, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  const rota = destino(profile)
  const ok = role === 'waiting' ? rota === '/aguardando' : rota === `/${role === 'admin' ? 'admin' : 'aluno'}`
  return ok ? children : <Navigate to={rota} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/recuperar" element={<Recover />} />
      <Route path="/redefinir" element={<Reset />} />
      <Route path="/aguardando" element={<Guard role="waiting"><Waiting /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><AdminLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="alunos" element={<Students />} />
        <Route path="alunos/:id" element={<StudentDetail />} />
        <Route path="alunos/:id/ficha/:letra" element={<PlanEditor />} />
        <Route path="exercicios" element={<Exercises />} />
        <Route path="mensagens" element={<Messages />} />
      </Route>
      <Route path="/aluno" element={<Guard role="student"><StudentLayout /></Guard>}>
        <Route index element={<Home />} />
        <Route path="treino" element={<Workouts />} />
        <Route path="treino/:letra" element={<Workout />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
