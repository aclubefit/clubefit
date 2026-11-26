import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { traduzErro, configured } from '../lib'
import Logo from '../components/Logo'
import Field from '../components/Field'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setBusy(true)
    const { error } = await signIn(email.trim(), password)
    if (error) setErro(traduzErro(error))
    setBusy(false)
  }

  return (
    <main className="auth">
      <Logo />
      <form onSubmit={enviar} className="card">
        <h1>Entrar</h1>
        {!configured && <p className="erro">Configuração do Supabase ausente. Preencha o arquivo .env.</p>}
        <Field id="email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="senha" label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <Link className="link" to="/recuperar">Esqueci minha senha</Link>
      </form>
      <p className="alt">Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </main>
  )
}
