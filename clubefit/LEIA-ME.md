# CLUBEFIT Academia In CESC — etapas 1 a 4.2

## 1. Banco (Supabase)
1. Abra `supabase/01_base.sql`, troque `TROQUE_PELO_EMAIL_DO_ADMIN` pelo e-mail do admin.
2. No Supabase: SQL Editor → New query → cole o conteúdo → Run.
3. Authentication → Users → Add user (e-mail do admin + senha forte, "Auto Confirm User").
   Se criar o usuário DEPOIS de rodar o SQL, rode de novo só o último comando (update ... role = 'admin').
4. Authentication → URL Configuration: em Site URL e Redirect URLs coloque o endereço do site na Netlify
   (e http://localhost:5173 para testes).

## 2. Rodar no computador
```
cp .env.example .env
npm install
npm run dev
```

## 3. Publicar na Netlify
- Suba a pasta para um repositório no GitHub e conecte na Netlify (build: `npm run build`, pasta: `dist`).
- Em Site configuration → Environment variables, crie:
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (valores no `.env.example`).
- Nunca coloque a chave `service_role` no projeto.
