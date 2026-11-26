import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, traduzErro } from '../lib'
import Logo from '../components/Logo'
import Field from '../components/Field'

export default function Register() {
  const [f, setF] = useState({ nome: '', email: '', telefone: '', nascimento: '', senha: '', confirma: '' })
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (f.senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (f.senha !== f.confirma) return setErro('As senhas não conferem.')
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: f.nome.trim(), phone: f.telefone.trim(), birth_date: f.nascimento },
      },
    })
    setBusy(false)
    if (error) return setErro(traduzErro(error))
    await supabase.auth.signOut()
    setOk(true)
  }

  if (ok) {
    return (
      <main className="auth">
        <Logo />
        <div className="card">
          <h1>Cadastro enviado</h1>
          <p>Confirme seu e-mail pelo link que enviamos. Depois, a academia vai analisar sua solicitação e você poderá entrar assim que ela for aprovada.</p>
          <Link className="btn" to="/login">Voltar ao login</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="auth">
      <Logo />
      <form onSubmit={enviar} className="card">
        <h1>Criar conta</h1>
        <Field id="nome" label="Nome completo" required autoComplete="name" value={f.nome} onChange={set('nome')} />
        <Field id="email" label="E-mail" type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
        <Field id="tel" label="Telefone" type="tel" required autoComplete="tel" value={f.telefone} onChange={set('telefone')} />
        <Field id="nasc" label="Data de nascimento" type="date" required value={f.nascimento} onChange={set('nascimento')} />
        <Field id="senha" label="Senha (mínimo 8 caracteres)" type="password" required autoComplete="new-password" value={f.senha} onChange={set('senha')} />
        <Field id="conf" label="Confirmar senha" type="password" required autoComplete="new-password" value={f.confirma} onChange={set('confirma')} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar cadastro'}</button>
      </form>
      <p className="alt">Já tem conta? <Link to="/login">Entrar</Link></p>
    </main>
  )
}
