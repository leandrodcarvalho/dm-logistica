# Publicação na Google Play e na App Store

O app das lojas é o **mesmo código** do site, empacotado com o [Capacitor](https://capacitorjs.com).
Não existe uma segunda base de código para manter.

## Antes de começar: instale como PWA (grátis, hoje)

Enquanto as contas das lojas não saem, o site já pode ser **instalado no celular**:
- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.

Ele abre em tela cheia, com ícone próprio. Para uma demo, isso costuma bastar.

## Preparar o projeto nativo (uma vez)

Requisitos: Node.js LTS, **Android Studio** (para Android) e **um Mac com Xcode** (para iOS).

```bash
git clone https://github.com/leandrodcarvalho/dm-logistica && cd dm-logistica
npm run mobile:setup   # instala o Capacitor e cria as pastas android/ e ios/
npm run mobile:icons   # gera ícones e splash a partir de assets/
npm run android        # abre no Android Studio
npm run ios            # abre no Xcode (somente no Mac)
```

Sempre que o código web mudar, rode `npm run mobile:sync` antes de gerar uma nova versão.

> O app nativo usa o **Supabase** (seção 2 de `HOSPEDAGEM.md`). Em modo demo, cada aparelho teria dados próprios.

---

## Google Play

**Custo:** US$ 25, uma única vez.

1. Crie a conta em https://play.google.com/console. A verificação de identidade leva alguns dias.
2. **Escolha o tipo de conta com cuidado:**
   - **Pessoal**: contas criadas depois de nov/2023 precisam rodar um **teste fechado com no mínimo 12 testadores, por 14 dias seguidos**, antes de liberar a produção.
   - **Organização** (exige CNPJ e número D-U-N-S, que é gratuito): **não** tem essa exigência. Se a DM tem CNPJ, este é o melhor caminho.
3. No Android Studio: **Build → Generate Signed App Bundle** → crie a *keystore*. **Guarde o arquivo e a senha**: sem eles não é possível atualizar o app.
4. No Play Console: *Criar app* → envie o `.aab` em **Teste interno**. O teste interno libera até 100 testadores e não passa por revisão.
5. Preencha a ficha da loja (ícone 512px, prints, descrição), a política de privacidade (uma URL pública), a classificação de conteúdo e a seção *Segurança dos dados*.
6. **Acesso ao app:** como o app exige login, informe à Google um usuário e senha de teste.
7. Avance para Teste fechado e depois para Produção.

**App só para a equipe?** Use os testes interno ou fechado indefinidamente, sem ir para Produção. Funciona bem para uso interno e evita a exposição pública.

---

## Apple App Store

**Custo:** US$ 99 por ano.

1. Inscreva-se em https://developer.apple.com/programs. Como **organização**, a inscrição exige o número D-U-N-S, e o app aparece com o nome da empresa.
2. **Sem Mac?** O [Codemagic](https://codemagic.io) tem plano gratuito com 500 minutos/mês de build em Mac na nuvem, suficiente para gerar e enviar versões.
3. No Xcode: defina o *Bundle Identifier* `br.com.dmlogistic.app`, selecione o Team, use *Product → Archive* e depois *Distribute App*.
4. No App Store Connect: distribua primeiro pelo **TestFlight** (até 10 mil testadores, com revisão mais leve). Para uma demo, isso basta.
5. Para a loja: prints de iPhone, política de privacidade e **conta de demonstração** para o revisor.

### ⚠️ Atenção na revisão da Apple
- A Apple costuma **rejeitar apps que são "só um site embrulhado"** (diretriz 4.2). Ajuda ter recursos de app: leitor de **código de barras/QR** para movimentar estoque, notificações de estoque baixo, uso offline. O leitor de código de barras é o próximo passo natural para um app de estoque.
- Apps de **uso interno** de uma empresa podem ir como **Custom App** (via Apple Business Manager) ou como **app não listado**, em vez de ficarem públicos na loja.

---

## Checklist rápido

| Item | Android | iOS |
|---|---|---|
| Conta de desenvolvedor | US$ 25 (uma vez) | US$ 99/ano |
| Máquina para build | Qualquer PC | Mac ou Codemagic |
| Política de privacidade (URL) | ✅ | ✅ |
| Usuário de teste para o revisor | ✅ | ✅ |
| Ícone e prints | 512px + prints | 1024px + prints |
| Tempo até publicar | dias (org.) / ~3 semanas (pessoal) | 1–3 dias de revisão |
