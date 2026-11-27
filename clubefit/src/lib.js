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

// ---- datas e frequência ----
export function inicioDaSemana(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // semana começa na segunda
  return x
}
export function semanasConsecutivas(datas) {
  const semanas = new Set(datas.map((d) => inicioDaSemana(d).getTime()))
  const atual = inicioDaSemana(new Date())
  if (!semanas.has(atual.getTime())) atual.setDate(atual.getDate() - 7)
  let n = 0
  while (semanas.has(atual.getTime())) { n++; atual.setDate(atual.getDate() - 7) }
  return n
}
export function mmss(total) {
  const t = Math.max(0, Math.floor(total))
  const h = Math.floor(t / 3600)
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0')
  const s = String(t % 60).padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}
