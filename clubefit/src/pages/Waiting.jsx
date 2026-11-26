import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'

export default function Waiting() {
  const { profile, signOut, refreshProfile } = useAuth()
  let titulo = 'Cadastro em análise'
  let texto = 'A academia ainda não aprovou seu acesso. Você poderá entrar assim que for aprovado.'
  if (profile?.status === 'rejected') {
    titulo = 'Cadastro não aprovado'
    texto = 'Sua solicitação não foi aprovada. Procure a recepção da academia para mais informações.'
  } else if (profile?.status === 'approved' && !profile?.active) {
    titulo = 'Acesso desativado'
    texto = 'Seu acesso está desativado. Procure a recepção da academia.'
  } else if (!profile) {
    titulo = 'Perfil não encontrado'
    texto = 'Não encontramos seu perfil. Saia e tente entrar novamente.'
  }
  return (
    <main className="auth">
      <Logo />
      <div className="card">
        <h1>{titulo}</h1>
        <p>{texto}</p>
        <button className="btn" onClick={refreshProfile}>Verificar de novo</button>
        <button className="btn ghost" onClick={signOut}>Sair</button>
      </div>
    </main>
  )
}
