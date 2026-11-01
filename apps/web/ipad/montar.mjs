// Monta o Palco Livre do iPad 2 num arquivo só: apps/web/public/ipad/index.html.
// O código é escrito em TypeScript moderno (e usa o mesmo motor de cifra do site e do app),
// e aqui vira JavaScript antigo (ES5), que o Safari do iOS 9 entende.
// Rodar depois de mudar algo em apps/web/ipad ou em packages/cifra:  npm run build:ipad
import { build, transform } from 'esbuild';
import { transformAsync } from '@babel/core';
import { parse } from 'acorn';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const web = join(aqui, '..');
const saida = join(web, 'public', 'ipad');

// A chave pública do banco (a mesma que já vai no site).
const env = readFileSync(join(web, '.env.production'), 'utf8');
const chave = /NEXT_PUBLIC_SUPABASE_ANON_KEY=(\S+)/.exec(env)?.[1];
if (!chave) throw new Error('Não achei NEXT_PUBLIC_SUPABASE_ANON_KEY em apps/web/.env.production');

const junto = await build({
  entryPoints: [join(aqui, 'app.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2018',
  charset: 'utf8',
  define: { __CHAVE_SUPABASE__: JSON.stringify(chave), __BANCO__: JSON.stringify('/sb') },
});

const antigo = await transformAsync(junto.outputFiles[0].text, {
  babelrc: false,
  configFile: false,
  sourceType: 'script',
  presets: [['@babel/preset-env', { targets: { ie: '11', safari: '9' }, modules: false, bugfixes: false }]],
});

const pequeno = await transform(antigo.code, { minify: true, target: 'es5', charset: 'utf8' });

// Garantia: se sobrou alguma coisa que o iOS 9 não entende, para aqui.
parse(pequeno.code, { ecmaVersion: 5 });

const css = (await transform(readFileSync(join(aqui, 'estilo.css'), 'utf8'), { loader: 'css', minify: true, target: 'safari9' })).code;
const html = readFileSync(join(aqui, 'index.html'), 'utf8')
  .replace('/*ESTILO*/', () => css)
  .replace('/*SCRIPT*/', () => pequeno.code.replace(/<\/script/gi, '<\\/script'));

const versao = createHash('sha256').update(html).digest('hex').slice(0, 12);
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, 'index.html'), html);
// Lista do que o iPad guarda para abrir sem internet. Mudou a versão, ele baixa a página nova.
writeFileSync(join(saida, 'ipad.appcache'), [
  'CACHE MANIFEST',
  '# versão ' + versao,
  '',
  'CACHE:',
  '/ipad',
  '/apple-icon.png',
  '',
  'NETWORK:',
  '*',
  '',
].join('\n'));
console.log('iPad: ' + (html.length / 1024).toFixed(0) + ' KB, versão ' + versao);
