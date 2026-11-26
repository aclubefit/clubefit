import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, traduzErro } from '../lib'
import Logo from '../components/Logo'
import Field from '../components/Field'

export function Recover() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setMsg(''); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir`,
    })
    setBusy(false)
    if (error) setErro(traduzErro(error))
    else setMsg('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')
  }

  return (
    <main className="auth">
      <Logo />
      <form onSubmit={enviar} className="card">
        <h1>Recuperar senha</h1>
        <Field id="email" label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        {msg && <p className="ok">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
        <Link className="link" to="/login">Voltar ao login</Link>
      </form>
    </main>
  )
}

export function Reset() {
  const nav = useNavigate()
  const [pronto, setPronto] = useState(false)
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setPronto(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'PASSWORD_RECOVERY') setPronto(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== conf) return setErro('As senhas não conferem.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setBusy(false)
    if (error) return setErro(traduzErro(error))
    nav('/', { replace: true })
  }

  return (
    <main className="auth">
      <Logo />
      <form onSubmit={enviar} className="card">
        <h1>Nova senha</h1>
        {!pronto && <p className="erro">Link inválido ou expirado. <Link to="/recuperar">Peça outro</Link>.</p>}
        <Field id="s" label="Nova senha" type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Field id="c" label="Confirmar nova senha" type="password" required autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn" disabled={busy || !pronto}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </main>
  )
}
