# DM Logístic

Controle de estoque e logística para **outlet de roupas**: web, Android e iOS com o mesmo código.

**Demo online:** https://leandrodcarvalho.github.io/dm-logistica/

| Perfil | E-mail | Senha |
|---|---|---|
| Gerencial | gerente@dmlogistic.com | demo123 |
| Funcionário | funcionario@dmlogistic.com | demo123 |

(Usuários do modo demonstração. No banco real, os usuários são criados no Supabase.)

## O que tem

| Tela | Gerente | Funcionário |
|---|:-:|:-:|
| Login com perfis | ✅ | ✅ |
| **Painel gerencial**: mais vendidos, itens em baixa (com cobertura em dias), saídas por dia e por categoria, valor em estoque | ✅ | — |
| **Consulta de estoque** por CD ou consolidada, filtros e exportação CSV | ✅ | ✅ |
| **Movimentações**: entrada, saída, transferência entre CDs | ✅ | ✅ |
| Ajuste de inventário (contagem) | ✅ | — |
| **Cadastro de produtos** (SKU por tamanho/cor, preço original × outlet, mínimo por CD) | ✅ | só consulta |
| **Cadastro de centros de distribuição** | ✅ | — |
| Usuários e perfis | ✅ | — |

Nada fiscal ou contábil, como combinado.

## Como funciona

- **Sem build:** HTML, CSS e JavaScript puros (módulos ES), na pasta `app/`. É só publicar a pasta.
- **Dois modos de dados**, mesma interface (`app/js/api/`):
  - **Demo** (padrão): dados no navegador, já preenchidos com 47 SKUs, 3 CDs e 90 dias de movimentações.
  - **Supabase:** Postgres + login reais, com regras de segurança no banco. Basta preencher `app/js/config.js`.
- **PWA:** instalável no celular.
- **Capacitor:** empacota o mesmo app para Google Play e App Store.

```
app/                 site (é o que vai para o ar)
  js/api/            backends: local.js (demo) e supabase.js
  js/views/          telas
supabase/            schema.sql (tabelas, RLS, função de movimentação) e seed.sql
docs/HOSPEDAGEM.md   GitHub Pages + Supabase, passo a passo (grátis)
docs/LOJAS.md        Google Play e App Store, passo a passo
capacitor.config.json
```

## Rodar localmente

```bash
cd app && python3 -m http.server 8080   # ou: npm run dev
```

Acesse http://localhost:8080.

## Próximos passos
- [ ] Campos definitivos dos produtos. Hoje os campos extras ficam em `atributos` (JSON), sem precisar mudar o banco.
- [ ] Leitor de código de barras no celular para registrar movimentações.
- [ ] Fotos dos produtos (Supabase Storage).
