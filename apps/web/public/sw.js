// Service worker do Palco Livre: guarda as telas do site para abrirem sem internet,
// principalmente no iPhone, com o site instalado na tela de início.
// As músicas e os repertórios ficam no IndexedDB (lib/offline.ts); aqui ficam só as telas e os arquivos do site.

const VERSAO = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'palco-livre-' + VERSAO;
const PAGINAS = ['/musicas', '/repertorios', '/grupos', '/conta', '/tocar', '/entrar', '/musicas/editor', '/musicas/importar', '/repertorios/editor', '/grupos/editor'];
const EXTRAS = ['/manifest.webmanifest', '/icone-192.png', '/icone-512.png'];
// Scripts, estilos e fontes que cada tela usa, achados no próprio HTML.
const ARQUIVOS = /\/_next\/static\/[^"'\s\\)<>]+/g;
// Sem resposta nesse tempo (internet ruim no palco), abre a tela guardada.
const PRAZO = 5000;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const arquivos = new Set(EXTRAS);
    let guardadas = 0;
    await Promise.all(PAGINAS.map(async p => {
      try {
        const r = await fetch(p, { cache: 'no-cache' });
        if (!r.ok || r.redirected) return;
        const html = await r.clone().text();
        await cache.put(p, r);
        guardadas++;
        for (const a of html.match(ARQUIVOS) ?? []) arquivos.add(a);
      } catch { /* fica para a próxima visita */ }
    }));
    // Sem nenhuma tela, não vale trocar a versão que já funciona.
    if (!guardadas) throw new Error('Não deu para guardar as telas.');
    await Promise.all([...arquivos].map(async a => {
      try { if (!(await cache.match(a))) await cache.add(a); } catch { /* idem */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith('palco-livre-') && nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // O banco (Supabase) e qualquer outro endereço seguem direto; quem cuida deles é o site.
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') e.respondWith(pagina(req, url));
  else if (url.pathname.startsWith('/_next/static/') || EXTRAS.includes(url.pathname)) e.respondWith(arquivo(req));
});

/** Tela: tenta a internet primeiro (para pegar as novidades) e, sem ela, abre a guardada. */
async function pagina(req, url) {
  const caminho = url.pathname.replace(/\/+$/, '') || '/';
  try {
    const r = await comPrazo(fetch(req), PRAZO);
    if (r.ok && !r.redirected && PAGINAS.includes(caminho)) await (await caches.open(CACHE)).put(caminho, r.clone());
    return r;
  } catch {
    // A tela é a mesma para qualquer ?repertorio=..., então guarda e procura sem o que vem depois do "?".
    const guardada = (await caches.match(caminho)) || (caminho === '/' ? null : await caches.match('/musicas'));
    if (guardada) return guardada;
    if (caminho === '/') return Response.redirect('/musicas', 302);
    return Response.error();
  }
}

/** Arquivos do site: têm nome novo a cada publicação, então o guardado vale para sempre. */
async function arquivo(req) {
  const guardado = await caches.match(req);
  if (guardado) return guardado;
  const r = await fetch(req);
  if (r.ok) await (await caches.open(CACHE)).put(req, r.clone());
  return r;
}

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('Demorou demais')), ms);
    promessa.then(r => { clearTimeout(t); ok(r); }, erro => { clearTimeout(t); falha(erro); });
  });
}
