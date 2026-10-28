# 11 — Publicar na Google Play (APK/AAB)

O ForgeFlow vira app Android "embrulhando" o próprio site num **TWA**
(Trusted Web Activity): o app da loja abre o site em tela cheia, sem barra do
navegador, com ícone, notificações e atalhos. Atualizou o site, o app
atualiza junto — não precisa publicar de novo na loja a cada mudança.

A versão nativa antiga (pasta `android/`, Expo) **não** tem as funções novas;
não use.

## O que precisa antes

1. **O site publicado num endereço fixo com HTTPS** (ex.:
   `https://forgeflow.vercel.app` ou um domínio próprio). O app da loja vai
   abrir exatamente esse endereço.
2. **Conta de desenvolvedor na Google Play Console** — taxa única de US$ 25
   (play.google.com/console).
3. O `manifest.webmanifest` já está pronto (nome, ícones, ícone "maskable",
   atalhos, categorias, `id`).

## Passo a passo

1. Abra **pwabuilder.com**, cole o endereço do site e clique em _Start_.
2. Em **Package for stores › Android**, escolha **Google Play** e preencha:
   - _Package ID_: `app.forgeflow.twa` (ou outro, mas não mude depois);
   - _App name_: ForgeFlow; _Launcher name_: ForgeFlow;
   - _Signing key_: **Create new** (guarde o arquivo `.keystore` e as
     senhas que ele gerar — sem eles não dá para atualizar o app depois).
3. Baixe o pacote. Ele traz:
   - `app-release-signed.aab` → é o que vai para a Play Store;
   - `app-release-signed.apk` → para instalar direto no celular e testar;
   - `assetlinks.json` → prova que o site e o app são do mesmo dono.
4. Coloque o `assetlinks.json` em `public/.well-known/assetlinks.json`
   neste projeto e publique o site de novo. Ele precisa abrir em
   `https://SEU-ENDERECO/.well-known/assetlinks.json`. Sem isso o app
   mostra a barra do navegador no topo.
5. Na Play Console: **Criar app** › preencha nome, idioma (pt-BR), app
   gratuito › em **Teste interno**, envie o `.aab` › adicione seu e-mail
   (e o do seu amigo) como testadores › instale pelo link de teste.
6. Quando estiver tudo certo, promova para **Produção** (a Google revisa;
   costuma levar de algumas horas a poucos dias). A loja pede: ícone 512×512
   (`public/icons/icon-512.png`), um banner 1024×500, de 2 a 8 capturas de
   tela do celular, descrição curta e longa e a política de privacidade
   (uma página simples dizendo o que o app guarda: treinos, perfil e,
   para quem usa amigos, o que é compartilhado com eles).

## Depois de publicado

- Mudanças no app = só publicar o site. O app da loja já abre a versão nova.
- Só é preciso gerar outro `.aab` se mudar nome, ícone, cores ou o endereço.
- O Supabase não muda nada: login com Google, notificações e amigos
  funcionam igual dentro do app.
