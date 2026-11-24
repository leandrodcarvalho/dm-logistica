# Hospedagem — custo zero

| Peça | Serviço | Custo |
|---|---|---|
| Site (o app web) | **GitHub Pages** (este repositório) | Grátis (repositório público) |
| Banco de dados + login | **Supabase** (plano Free) | Grátis |
| App Android | Google Play Console | US$ 25, pagos uma vez |
| App iOS | Apple Developer Program | US$ 99 por ano |

## 1. Site no GitHub Pages (já configurado)

O workflow `.github/workflows/pages.yml` publica a pasta `app/` a cada push na `main`.

1. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (só precisa fazer isso uma vez).
2. Acompanhe em **Actions**. O endereço fica assim:
   **https://leandrodcarvalho.github.io/dm-logistica/**

Sem o Supabase configurado, o site abre em **modo demonstração**. Os dados ficam no navegador de quem acessa e já vêm preenchidos. Isso basta para mostrar o sistema.

> Alternativas igualmente gratuitas: Cloudflare Pages, Netlify ou Vercel. Basta apontar para a pasta `app/`, sem nenhum comando de build.

## 2. Banco real no Supabase (dados compartilhados entre todos)

1. Crie uma conta em https://supabase.com e depois **New project**. Região sugerida: *South America (São Paulo)*.
2. **SQL Editor → New query**: cole e rode `supabase/schema.sql`.
3. Na mesma tela, rode `supabase/seed.sql` (dados de exemplo; opcional).
4. **Authentication → Sign In / Providers → Email**: desative *Allow new users to sign up*, para que ninguém se cadastre sozinho.
5. **Authentication → Users → Add user → Create new user**: crie o gerente e os funcionários (marque *Auto Confirm User*).
   Todo usuário novo nasce como **funcionário**. Para promover o primeiro gerente, rode no SQL Editor:
   ```sql
   update perfis set perfil = 'gerente', nome = 'Seu Nome' where email = 'seu@email.com';
   ```
   A partir daí, o próprio gerente muda perfis pela tela **Usuários**.
6. **Project Settings → API**: copie a *Project URL* e a *anon public key* para `app/js/config.js`. Depois faça commit e push.

Pronto: o site passa a usar o banco. Para ver o modo demo mesmo com o banco configurado, acesse com `?demo` no fim do endereço.

### Segurança
- A *anon key* é pública por natureza. Quem protege os dados são as regras **RLS** do `schema.sql`:
  - somente usuários logados e ativos leem os dados;
  - somente gerentes alteram produtos, CDs e perfis;
  - o saldo de estoque só muda pela função `registrar_movimentacao`, que valida saldo e perfil.
- **Nunca** coloque a *service_role key* no app.

### Limites do plano Free
- Projetos sem atividade por 7 dias são **pausados**. Para reativar: Dashboard → projeto → *Resume project*. Para nunca pausar, o plano Pro custa US$ 25/mês.
- 500 MB de banco por projeto: sobra muito para uma demo e até para operação pequena.
