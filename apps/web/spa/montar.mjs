// Junta o JS e o CSS do build num index.html só, que abre direto no navegador (até com dois cliques no arquivo).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('./dist/', import.meta.url));
const saida = fileURLToPath(new URL('../../../ver-site/', import.meta.url));
const arquivos = readdirSync(dist + 'assets');
const ler = (fim) => readFileSync(dist + 'assets/' + arquivos.find(a => a.endsWith(fim)), 'utf8');
const js = ler('.js').replace(/<\/script/gi, '<\\/script');
const css = ler('.css').replace(/<\/style/gi, '<\\/style');

const icone = readFileSync(fileURLToPath(new URL('../app/icon.svg', import.meta.url)), 'utf8').trim();

const corpo = `<title>Palco Livre</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(icone)}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono:wght@400;700&family=Rubik:wght@800&display=swap">
<style>
:root { --font-ui: 'Roboto'; --font-mono: 'Roboto Mono'; --font-logo: 'Rubik'; }
${css}
</style>
<div id="raiz"></div>
<script>
// Sem armazenamento no navegador, guarda os dados só enquanto a página estiver aberta.
try { localStorage.setItem('__pl', '1'); localStorage.removeItem('__pl'); } catch (e) {
  var m = {};
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
      clear: function () { m = {}; },
      key: function (i) { return Object.keys(m)[i] || null; },
      get length() { return Object.keys(m).length; }
    } });
  } catch (e2) {}
}
// Modo escuro escolhido na lua do topo (o mesmo do app/layout.tsx).
try { if (localStorage.getItem('palco-tema') === 'escuro') document.documentElement.dataset.tema = 'escuro'; } catch (e) {}
</script>
<script type="module">
${js}
</script>
`;

// ver-site/index.html abre no computador; dist/artifact.html é o mesmo conteúdo sem o esqueleto da página.
mkdirSync(saida, { recursive: true });
writeFileSync(saida + 'index.html', `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${corpo}</body>
</html>
`);
writeFileSync(dist + 'artifact.html', corpo);
console.log('Pronto: ver-site/index.html');
