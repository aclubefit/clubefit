import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')

const MSGS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 8 caracteres.',
}
export function traduzErro(err) {
  if (!err) return ''
  const m = err.message || String(err)
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return MSGS[m] || 'Não foi possível concluir. Tente novamente.'
}
