# Palco Livre

Cifras e repertórios para a banda, com o site para montar tudo e o app (celular e tablet) para tocar.
O leitor do app vira página por toque ou por **qualquer pedal Bluetooth ou USB**.

```
apps/web       site (Next.js): Músicas, Repertórios, Grupos, Minha conta e o leitor no navegador
apps/mobile    app (Expo): Início, Conteúdo, Músicas, Repertórios, Leitor, Configurações e Pedal
packages/cifra formato da cifra, transposição, paginação e desenhos de acordes (usado pelos dois)
supabase       banco de dados: tabelas, permissões e testes
```

Sem banco configurado, o site e o app abrem em **modo demonstração**, com músicas de exemplo.
Dá para testar tudo assim antes de criar a conta no Supabase.

## Ver sem instalar nada

Abra `ver-site/index.html` com dois cliques: é o site inteiro num arquivo só, em modo demonstração
(o que você mexer fica guardado só nesse navegador). Depois de mudar o código do site, rode
`npm run build:index` para gerar esse arquivo de novo.

## 1. Testar no computador

Precisa do Node.js 22 ou mais novo.

```
npm install
npm run dev:web
```

Abra http://localhost:3000 e clique em **Entrar na demonstração**.

Para o app:

```
npm run instalar:app
npm run dev:app
```

Aparece um QR code. No celular, instale o **Expo Go** (Play Store) e leia o QR code.
No Expo Go o leitor funciona por toque; o pedal só funciona no APK (passo 4).

## 2. Criar o banco (Supabase, grátis)

1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. No projeto, abra **SQL Editor**, cole todo o arquivo `supabase/migrations/20261023180000_inicio.sql` e clique em **Run**.
   Depois faça o mesmo com `supabase/migrations/20261024220000_permissoes.sql` (sem ele o Supabase recusa as consultas).
3. Em **Authentication › Sign In / Providers › Email**, desligue **Confirm email** se quiser que a conta funcione na hora, sem e-mail de confirmação.
4. Em **Project Settings › API**, copie a **Project URL** e a chave **anon public**.

## 3. Ligar o site ao banco

Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Rode `npm run dev:web` de novo. Agora cada pessoa cria a própria conta em **Criar conta**.

Para colocar o site na internet: crie uma conta grátis em https://vercel.com, rode `npx vercel` dentro de `apps/web`
e cadastre as mesmas duas variáveis em **Settings › Environment Variables**. Depois coloque o endereço do site em
**Supabase › Authentication › URL Configuration › Site URL**.

## 4. Gerar o APK do app (com pedal)

1. Copie `apps/mobile/.env.example` para `apps/mobile/.env` com a mesma URL e chave (para testar no Expo Go).
2. Preencha as mesmas duas linhas em `apps/mobile/eas.json`, no bloco `preview › env`.
3. Crie uma conta grátis em https://expo.dev.
4. Na pasta principal do projeto (a que tem este arquivo):

```
git init
git add .
git commit -m "Palco Livre"
cd apps/mobile
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Se o `git commit` pedir seu nome, rode antes `git config --global user.name "Lucas"` e `git config --global user.email "seu@email"`.

O EAS monta o APK na nuvem (uns 15 minutos) e mostra um link. Abra o link no celular ou tablet e instale.

## Como a banda usa

1. Cada integrante cria a conta no site (o app usa o mesmo e-mail e senha).
2. Quem monta os repertórios cria um **Grupo** no site, adiciona os integrantes pelo nick ou e-mail e coloca os repertórios.
3. No app, cada um vai em **Conteúdo › Baixar meu conteúdo**. Pronto: funciona sem internet.
4. Mudou alguma coisa no site? No app, **Conteúdo › Atualizar meu conteúdo**.

## Pedal

O Android e o iPad entendem o pedal como um teclado, então qualquer marca funciona.
Pareie o pedal no Bluetooth do aparelho e abra **Início › Pedal**: aperte os botões para testar e use **Ensinar**
se algum botão não fizer nada. Já vêm prontos: Page Down/Up, setas, Espaço, Enter e Próxima/Anterior faixa.

## Como escrever a cifra

Acordes na linha de cima, letra na linha de baixo, em fonte de largura fixa (como no editor do site).

```
[Intro] G  D/F#  Em  C

[Primeira Parte]
G               D/F#
Pela estrada de terra eu vou

{refrão}
C               G
Ô, estrada, me leva
{/refrão}

{2ª voz}
Lá atrás, lá atrás
{/2ª voz}

e|-----3-----2-----0-----|
// Anotação: só aparece em cinza e itálico
```

Os botões **Refrão** e **2ª Voz** do editor colocam as marcas sozinhos nas linhas selecionadas.

## Testes

```
npm test                         # formato da cifra e paginação
```

`supabase/tests/rls.sql` confere as permissões (quem vê e quem edita o quê) num Postgres local.
