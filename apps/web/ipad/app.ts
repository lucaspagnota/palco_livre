// Palco Livre para o iPad 2 (iOS 9): só leitura, bem leve, funciona sem internet depois de baixar.
// Telas: Entrar, Repertórios/Músicas, um repertório e o leitor (igual ao do app).
// Escrito sem React e sem nada moderno no navegador; o montar.mjs converte para o JavaScript antigo.
import './polyfills';
import { APARENCIA_PADRAO, TAMANHOS, estiloDaLinha, gridFor, layoutPages, passosDoShow, transposeKey, type PassoDoShow, type Row } from '@palco/cifra';
import {
  SEM_INTERNET, baixarConteudo, cifraDe, conteudoGuardado, entrar, gravarConfig, letraGuardada, letrasNoIpad, lerConfig,
  sairDaConta, sessaoGuardada, type Conteudo, type MusicaResumo, type Repertorio,
} from './dados';

const app = document.getElementById('app') as HTMLElement;
const A = APARENCIA_PADRAO;
let conteudo: Conteudo | null = conteudoGuardado();
const config = lerConfig();

// ---------- Ajudantes ----------

function esc(s: string | null | undefined) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ACENTOS: Record<string, string> = { á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o', ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n' };
/** Para buscar e ordenar sem ligar para maiúsculas e acentos. */
function chave(s: string) {
  return s.toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, c => ACENTOS[c] || c);
}
const porTitulo = <T extends { titulo: string }>(a: T, b: T) => {
  const x = chave(a.titulo);
  const y = chave(b.titulo);
  return x < y ? -1 : x > y ? 1 : 0;
};

const dois = (n: number) => (n < 10 ? '0' : '') + n;
const hora = () => { const d = new Date(); return dois(d.getHours()) + ':' + dois(d.getMinutes()); };
function quando(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ' às ' + dois(d.getHours()) + ':' + dois(d.getMinutes());
}

let ultimoToque = 0;
/** Toque rápido (sem o atraso do clique) que também funciona com mouse. */
function toque(el: Element | null, fn: () => void) {
  if (!el) return;
  let x0 = 0;
  let y0 = 0;
  let ativo = false;
  el.addEventListener('touchstart', (e: Event) => {
    const p = (e as TouchEvent).touches[0];
    x0 = p.clientX; y0 = p.clientY; ativo = true;
  }, false);
  el.addEventListener('touchend', (e: Event) => {
    if (!ativo) return;
    ativo = false;
    const p = (e as TouchEvent).changedTouches[0];
    if (Math.abs(p.clientX - x0) < 20 && Math.abs(p.clientY - y0) < 20) {
      e.preventDefault();
      ultimoToque = Date.now();
      fn();
    }
  }, false);
  el.addEventListener('click', () => { if (Date.now() - ultimoToque > 700) fn(); }, false);
}

const musicaPorId = (id: string) => {
  if (!conteudo) return undefined;
  for (const m of conteudo.musicas) if (m.id === id) return m;
  return undefined;
};

// ---------- Telas ----------

type Tela = { nome: 'entrar' } | { nome: 'lista' } | { nome: 'repertorio'; id: string } | { nome: 'leitor' };
let tela: Tela = { nome: 'entrar' };
let aba: 'repertorios' | 'musicas' = 'repertorios';
let busca = '';
let aviso = '';
let baixando = '';

function mostrar(t: Tela) {
  if (tela.nome === 'leitor' && t.nome !== 'leitor') fecharLeitor();
  tela = t;
  window.scrollTo(0, 0);
  desenhar();
}

function desenhar() {
  if (tela.nome === 'entrar') desenharEntrar();
  else if (tela.nome === 'lista') desenharLista();
  else if (tela.nome === 'repertorio') desenharRepertorio(tela.id);
}

function topo(direita: string, esquerda = '') {
  return '<div class="topo">' + (esquerda || '<div class="marca"><span class="logo"><i class="tri"></i></span> Palco Livre</div>') + '<div class="topo-botoes">' + direita + '</div></div>';
}

function desenharEntrar() {
  app.innerHTML = topo('') +
    '<form class="entrar" id="form">' +
    '<h1>Entrar</h1>' +
    '<p class="suave">Use o mesmo e-mail e senha do site do Palco Livre.</p>' +
    '<label>E-mail<input id="email" type="email" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
    '<label>Senha<input id="senha" type="password"></label>' +
    (aviso ? '<p class="erro">' + esc(aviso) + '</p>' : '') +
    '<button class="botao grande" type="submit" id="botao-entrar">Entrar</button>' +
    '</form>';
  const form = document.getElementById('form') as HTMLFormElement;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const senha = (document.getElementById('senha') as HTMLInputElement).value;
    if (!email || !senha) { aviso = 'Preencha o e-mail e a senha.'; desenhar(); return; }
    const b = document.getElementById('botao-entrar') as HTMLButtonElement;
    b.disabled = true;
    b.textContent = 'Entrando...';
    entrar(email, senha).then(() => {
      aviso = '';
      mostrar({ nome: 'lista' });
      atualizar();
    }, (err: Error) => {
      aviso = err.message;
      desenhar();
      (document.getElementById('email') as HTMLInputElement).value = email;
    });
  });
}

/** Baixa tudo de novo (só o que mudou). */
function atualizar() {
  if (baixando) return;
  baixando = 'Baixando a lista...';
  aviso = '';
  desenhar();
  baixarConteudo(a => {
    if (a.total) { baixando = 'Baixando cifras: ' + a.feitas + ' de ' + a.total; desenhar(); }
  }).then(r => {
    conteudo = r.conteudo;
    baixando = '';
    aviso = r.semEspaco ? r.semEspaco + ' cifras não couberam no iPad. Apague repertórios antigos no site e atualize de novo.' : '';
    desenhar();
  }, (e: Error & { status?: number }) => {
    baixando = '';
    aviso = e.message;
    if (e.status === 400 || e.status === 401) {
      // Sessão vencida de vez: precisa entrar de novo (o que está no iPad continua lá).
      aviso = 'Sua sessão venceu. Entre de novo para atualizar.';
    }
    desenhar();
  });
}

function desenharLista() {
  const s = sessaoGuardada();
  const botoes =
    '<button class="botao claro" data-acao="atualizar"' + (baixando ? ' disabled' : '') + '>' + (baixando ? 'Baixando...' : '⟳ Atualizar') + '</button>' +
    '<button class="botao claro" data-acao="conta">Conta</button>';
  let html = topo(botoes);
  html += '<div class="abas">' +
    '<button class="aba' + (aba === 'repertorios' ? ' ativa' : '') + '" data-acao="aba-repertorios">Repertórios</button>' +
    '<button class="aba' + (aba === 'musicas' ? ' ativa' : '') + '" data-acao="aba-musicas">Músicas</button>' +
    '</div>';
  html += '<div class="status">' +
    (baixando ? '<b>' + esc(baixando) + '</b>' :
      conteudo ? 'Atualizado em ' + quando(conteudo.baixadoEm) + ' · ' + letrasNoIpad() + ' cifras guardadas no iPad' : 'Toque em Atualizar para baixar suas músicas.') +
    '</div>';
  if (aviso) html += '<div class="aviso">' + esc(aviso) + (!s || /Entre de novo/.test(aviso) ? ' <button class="botao pequeno" data-acao="reentrar">Entrar</button>' : '') + '</div>';
  html += '<div class="busca"><input id="busca" type="search" placeholder="Buscar ' + (aba === 'repertorios' ? 'repertório' : 'música ou artista') + '" value="' + esc(busca) + '" autocorrect="off"></div>';
  html += '<div id="itens"></div>';
  app.innerHTML = html;
  desenharItens();
  const b = document.getElementById('busca') as HTMLInputElement;
  b.addEventListener('input', () => { busca = b.value; desenharItens(); });
}

function desenharItens() {
  const lugar = document.getElementById('itens');
  if (!lugar) return;
  const b = chave(busca.trim());
  const eu = sessaoGuardada()?.euId;
  let html = '';
  if (!conteudo) { lugar.innerHTML = ''; return; }
  if (aba === 'repertorios') {
    const lista = conteudo.repertorios.slice().sort(porTitulo).filter(r => !b || chave(r.titulo).indexOf(b) >= 0);
    for (const r of lista) {
      const n = r.itens.filter(i => i.musicaId).length;
      const deOutro = r.donoId !== eu;
      const info = [n + (n === 1 ? ' música' : ' músicas'), r.estilo, deOutro ? 'da banda · ' + (conteudo.nicks[r.donoId] || 'outra pessoa') : ''].filter(Boolean).join(' · ');
      html += '<div class="item">' +
        '<button class="item-texto" data-acao="abrir-rep" data-id="' + esc(r.id) + '"><b>' + esc(r.titulo) + '</b><span>' + esc(info) + '</span></button>' +
        '<button class="play" data-acao="tocar-rep" data-id="' + esc(r.id) + '" aria-label="Tocar"><i class="tri"></i></button>' +
        '</div>';
    }
    if (!lista.length) html = '<p class="vazio">Nenhum repertório' + (b ? ' com essa busca' : '') + '.</p>';
  } else {
    const lista = conteudo.musicas.slice().sort(porTitulo).filter(m => !b || chave(m.titulo + ' ' + m.artista).indexOf(b) >= 0);
    // Até 300 de cada vez: o iPad 2 fica lento com listas enormes.
    for (const m of lista.slice(0, 300)) {
      const guardada = letraGuardada(m.id) !== null;
      html += '<div class="item">' +
        '<button class="item-texto" data-acao="tocar-musica" data-id="' + esc(m.id) + '"><b>' + esc(m.titulo) + '</b><span>' +
        esc([m.artista, m.tom ? 'Tom ' + m.tom : ''].filter(Boolean).join(' · ')) + (guardada ? '' : ' · <i>precisa de internet</i>') + '</span></button>' +
        '</div>';
    }
    if (lista.length > 300) html += '<p class="vazio">Mais ' + (lista.length - 300) + ' músicas. Use a busca para achar.</p>';
    if (!lista.length) html = '<p class="vazio">Nenhuma música' + (b ? ' com essa busca' : '') + '.</p>';
  }
  lugar.innerHTML = html;
}

function desenharRepertorio(id: string) {
  const r = conteudo && conteudo.repertorios.filter(x => x.id === id)[0];
  if (!r) { mostrar({ nome: 'lista' }); return; }
  const voltar = '<button class="botao claro" data-acao="voltar">‹ Voltar</button>';
  let html = topo('<button class="botao" data-acao="tocar-rep" data-id="' + esc(r.id) + '"><i class="tri"></i> Tocar</button>', voltar);
  html += '<div class="cabeca"><h1>' + esc(r.titulo) + '</h1></div>';
  const show = passosDoShow(r.itens, x => !!musicaPorId(x));
  let blocoAntes: string | null = null;
  for (const p of show) {
    const m = musicaPorId(p.musicaId)!;
    if (p.bloco && p.bloco !== blocoAntes) html += '<div class="bloco">' + esc(p.bloco) + '</div>';
    blocoAntes = p.bloco;
    html += '<div class="item">' +
      '<button class="item-texto" data-acao="tocar-rep" data-id="' + esc(r.id) + '" data-inicio="' + p.indice + '">' +
      '<b><span class="numero">' + p.numero + '</span>' + esc(m.titulo) + '</b><span class="recuo">' + esc([m.artista, m.tom ? 'Tom ' + m.tom : ''].filter(Boolean).join(' · ')) +
      (letraGuardada(m.id) === null ? ' · <i>não baixada</i>' : '') + '</span></button></div>';
    if (p.pausaDepois) html += '<div class="pausa">' + esc(p.pausaDepois) + '</div>';
  }
  if (!show.length) html += '<p class="vazio">Repertório vazio.</p>';
  app.innerHTML = html;
}

// Cliques nas telas de lista (o leitor tem os toques dele).
app.addEventListener('click', e => {
  let el = e.target as HTMLElement | null;
  while (el && el !== app && !el.getAttribute('data-acao')) el = el.parentElement;
  if (!el || el === app) return;
  const acao = el.getAttribute('data-acao');
  const id = el.getAttribute('data-id') || '';
  if (acao === 'atualizar') atualizar();
  else if (acao === 'aba-repertorios' || acao === 'aba-musicas') { aba = acao === 'aba-musicas' ? 'musicas' : 'repertorios'; busca = ''; desenhar(); }
  else if (acao === 'abrir-rep') mostrar({ nome: 'repertorio', id });
  else if (acao === 'voltar') mostrar({ nome: 'lista' });
  else if (acao === 'tocar-rep') tocarRepertorio(id, Number(el.getAttribute('data-inicio')) || 0);
  else if (acao === 'tocar-musica') tocarMusica(id);
  else if (acao === 'reentrar') { aviso = ''; mostrar({ nome: 'entrar' }); }
  else if (acao === 'conta') {
    const s = sessaoGuardada();
    if (confirm('Conta: ' + (s ? s.email : '') + '\n\nSair da conta? As cifras guardadas no iPad serão apagadas.')) {
      sairDaConta();
      conteudo = null;
      aviso = '';
      mostrar({ nome: 'entrar' });
    }
  }
}, false);

// ---------- Leitor ----------

interface Faixa { musica: MusicaResumo; letra: string; passo: PassoDoShow | null }

interface EstadoLeitor {
  faixas: Faixa[];
  repertorio: Repertorio | null;
  atual: number;
  pagina: number;
  paginas: Row[][];
  porVez: number;
  /** Meios-tons mudados aqui, por música. Vale só enquanto o leitor está aberto. */
  tons: Record<string, number>;
  opcoes: boolean;
  irParaFim: boolean;
}

let L: EstadoLeitor | null = null;
let relogio = 0;
let leitorEl: HTMLElement | null = null;

function tocarRepertorio(id: string, inicio: number) {
  const r = conteudo && conteudo.repertorios.filter(x => x.id === id)[0];
  if (!r) return;
  const show = passosDoShow(r.itens, x => !!musicaPorId(x) && letraGuardada(x) !== null);
  const faixas: Faixa[] = show.map(p => ({ musica: musicaPorId(p.musicaId)!, letra: letraGuardada(p.musicaId) || '', passo: p }));
  if (!faixas.length) { alert('As cifras deste repertório ainda não estão no iPad. Toque em Atualizar com internet.'); return; }
  // O início veio da lista completa; sem alguma música baixada, procura a mesma música.
  const todos = passosDoShow(r.itens, x => !!musicaPorId(x));
  const alvo = todos[inicio] ? todos[inicio].musicaId : '';
  let i = 0;
  for (let k = 0; k < faixas.length; k++) if (faixas[k].musica.id === alvo) { i = k; break; }
  abrirLeitor(faixas, r, i);
}

function tocarMusica(id: string) {
  const m = musicaPorId(id);
  if (!m) return;
  cifraDe(m).then(letra => abrirLeitor([{ musica: m, letra, passo: null }], null, 0), (e: Error) => {
    alert(e.message === SEM_INTERNET ? 'Esta música ainda não está no iPad e agora não tem internet.' : e.message);
  });
}

function abrirLeitor(faixas: Faixa[], repertorio: Repertorio | null, atual: number) {
  L = { faixas, repertorio, atual, pagina: 0, paginas: [], porVez: 1, tons: {}, opcoes: false, irParaFim: false };
  tela = { nome: 'leitor' };
  document.body.className = 'no-leitor';
  app.innerHTML = '';
  leitorEl = document.createElement('div');
  leitorEl.className = 'leitor';
  leitorEl.innerHTML =
    '<div class="l-topo">' +
    '<div class="l-esq" id="l-ant"></div>' +
    '<div class="l-meio" id="l-meio"></div>' +
    '<div class="l-dir" id="l-prox"></div>' +
    '</div>' +
    '<div class="l-area" id="l-area"><div class="l-paginas" id="l-paginas"></div>' +
    '<div class="l-zona l-zona-esq" id="l-voltar"></div><div class="l-zona l-zona-dir" id="l-avancar"></div></div>' +
    '<div class="l-rodape">' +
    '<div class="l-rod-esq"><b>PalcoLivre</b><span>' + esc(repertorio ? repertorio.titulo.toUpperCase() : '') + '</span></div>' +
    '<button class="l-sair" id="l-sair">⏏︎ SAIR</button>' +
    '<div class="l-rod-dir"><button class="l-engrenagem" id="l-opcoes" aria-label="Opções">⚙︎</button><b id="l-hora"></b></div>' +
    '</div>' +
    '<div id="l-modal"></div>';
  document.body.appendChild(leitorEl);
  // Sem arrastar a página (o Safari puxa a tela inteira).
  leitorEl.addEventListener('touchmove', e => { if (!(L && L.opcoes)) e.preventDefault(); }, false);
  toque(document.getElementById('l-voltar'), voltarPagina);
  toque(document.getElementById('l-avancar'), avancarPagina);
  toque(document.getElementById('l-ant'), () => irPara(L!.atual - 1));
  toque(document.getElementById('l-prox'), () => irPara(L!.atual + 1));
  toque(document.getElementById('l-sair'), () => mostrar(repertorio ? { nome: 'repertorio', id: repertorio.id } : { nome: 'lista' }));
  toque(document.getElementById('l-opcoes'), () => { L!.opcoes = true; desenharOpcoes(); });
  const h = () => { const el = document.getElementById('l-hora'); if (el) el.textContent = hora(); };
  h();
  relogio = window.setInterval(h, 15000);
  montarMusica();
  if (!config.instrucoesVistas) mostrarInstrucoes();
}

function fecharLeitor() {
  window.clearInterval(relogio);
  if (leitorEl && leitorEl.parentNode) leitorEl.parentNode.removeChild(leitorEl);
  leitorEl = null;
  L = null;
  document.body.className = '';
}

const MARGEM = 8;

/** Calcula as páginas da música atual para o tamanho da tela. */
function montarMusica() {
  if (!L) return;
  const f = L.faixas[L.atual];
  const area = document.getElementById('l-area') as HTMLElement;
  const w = area.clientWidth;
  const h = area.clientHeight;
  const paisagem = w > h;
  const tamanho = (TAMANHOS[config.tamanho - 1] || TAMANHOS[1]) * 1.2;
  const recuo = Math.round(tamanho * 0.4);
  const duas = config.duasPaginas && paisagem && w >= 800;
  L.porVez = duas ? 2 : 1;
  const largura = Math.max(120, (w - MARGEM * 2 - (duas ? MARGEM * 2 : 0)) / L.porVez);
  const grade = gridFor(largura - recuo, Math.max(120, h - 4), tamanho);
  const passos = L.tons[f.musica.id] || 0;
  const tom = f.musica.tom ? transposeKey(f.musica.tom, passos) : '';
  L.paginas = layoutPages(f.letra, { cols: grade.cols, rows: grade.rows, steps: passos, show: config.soLetra ? 'letra' : 'tudo', key: tom });
  const total = L.paginas.length;
  if (L.irParaFim) { L.irParaFim = false; L.pagina = Math.max(0, Math.floor((total - 1) / L.porVez) * L.porVez); }
  else L.pagina = Math.min(Math.floor(L.pagina / L.porVez) * L.porVez, Math.max(0, total - 1));
  desenharPagina(grade, largura, recuo, tom);
}

let ultimaGrade: { grade: ReturnType<typeof gridFor>; largura: number; recuo: number; tom: string } | null = null;

function desenharPagina(grade: ReturnType<typeof gridFor>, largura: number, recuo: number, tom: string) {
  if (!L) return;
  ultimaGrade = { grade, largura, recuo, tom };
  const f = L.faixas[L.atual];
  const m = f.musica;
  const total = L.paginas.length;

  // Barra de cima: título (volta música), o que vem depois (pausa, bloco) e a próxima música.
  (document.getElementById('l-ant') as HTMLElement).innerHTML =
    '<div class="l-titulo">' + esc(m.titulo.toUpperCase()) + '</div>' +
    '<div class="l-sub">' + (m.artista ? '<span>' + esc(m.artista) + '</span>' : '') + (tom ? '<b>Tom: ' + esc(tom) + '</b>' : '') +
    (m.capo ? '<span>Capo ' + m.capo + 'ª</span>' : '') + '</div>';
  const proxima = L.faixas[L.atual + 1];
  const pausa = f.passo && f.passo.pausaDepois;
  const blocoSeguinte = proxima && proxima.passo && proxima.passo.bloco && f.passo && proxima.passo.bloco !== f.passo.bloco ? proxima.passo.bloco : null;
  (document.getElementById('l-meio') as HTMLElement).innerHTML =
    (pausa ? '<div class="l-pausa">' + esc(pausa.toUpperCase()) + '</div>' : '') +
    (blocoSeguinte ? '<div class="l-bloco">▸ ' + esc(blocoSeguinte.toUpperCase()) + '</div>' : '');
  const pags = Math.max(1, Math.ceil(total / L.porVez));
  (document.getElementById('l-prox') as HTMLElement).innerHTML =
    '<div class="l-conta">♫ ' + (L.atual + 1) + '/' + L.faixas.length + '&nbsp;&nbsp; ▤ ' + Math.min(Math.floor(L.pagina / L.porVez) + 1, pags) + '/' + pags + '</div>' +
    (proxima ? '<div class="l-proxima"><i class="tri"></i> ' + esc(proxima.musica.titulo) + '</div>' : '');

  // A cifra: uma linha de texto monoespaçado por linha da grade.
  let html = '';
  for (let p = L.pagina; p < L.pagina + L.porVez && p < total; p++) {
    html += '<div class="l-pagina" style="width:' + Math.floor(largura) + 'px' + (p > L.pagina ? ';margin-left:' + MARGEM * 2 + 'px' : '') + '">';
    const barra = Math.max(2, Math.round(grade.font / 7));
    for (const l of L.paginas[p]) {
      const e = estiloDaLinha(l.kind, l.refrao, l.voz2, A);
      const marcador = l.refrao && l.kind !== 'blank';
      html += '<div class="l-linha" style="height:' + grade.line + 'px;line-height:' + grade.line + 'px;padding-left:' + recuo + 'px;font-size:' + grade.font + 'px;color:' + e.cor +
        (e.negrito ? ';font-weight:bold' : '') + (e.italico ? ';font-style:italic' : '') + '">' +
        (marcador ? '<i class="l-marca" style="width:' + barra + 'px;background:' + A.refrao + '"></i>' : '') +
        (esc(l.text) || ' ') + '</div>';
    }
    html += '</div>';
  }
  (document.getElementById('l-paginas') as HTMLElement).innerHTML = html;
}

function irPara(i: number) {
  if (!L || i < 0 || i >= L.faixas.length) return;
  L.atual = i;
  L.pagina = 0;
  montarMusica();
}

function avancarPagina() {
  if (!L) return;
  if (L.pagina + L.porVez < L.paginas.length) {
    L.pagina += L.porVez;
    if (ultimaGrade) desenharPagina(ultimaGrade.grade, ultimaGrade.largura, ultimaGrade.recuo, ultimaGrade.tom);
  } else irPara(L.atual + 1);
}

function voltarPagina() {
  if (!L) return;
  if (L.pagina > 0) {
    L.pagina = Math.max(0, L.pagina - L.porVez);
    if (ultimaGrade) desenharPagina(ultimaGrade.grade, ultimaGrade.largura, ultimaGrade.recuo, ultimaGrade.tom);
  } else if (L.atual > 0) {
    L.irParaFim = true;
    L.atual--;
    montarMusica();
  }
}

function desenharOpcoes() {
  const lugar = document.getElementById('l-modal');
  if (!L || !lugar) return;
  if (!L.opcoes) { lugar.innerHTML = ''; return; }
  const f = L.faixas[L.atual];
  const passos = L.tons[f.musica.id] || 0;
  const tom = f.musica.tom ? transposeKey(f.musica.tom, passos) : '';
  let lista = '';
  if (L.faixas.length > 1) {
    lista += '<div class="o-lista">';
    for (let i = 0; i < L.faixas.length; i++) {
      const p = L.faixas[i].passo;
      const antes = i > 0 ? L.faixas[i - 1].passo : null;
      if (p && p.bloco && (!antes || antes.bloco !== p.bloco)) lista += '<div class="o-bloco">' + esc(p.bloco.toUpperCase()) + '</div>';
      lista += '<button class="o-musica' + (i === L.atual ? ' atual' : '') + '" data-o="ir" data-i="' + i + '"><span>' + (p ? p.numero : i + 1) + '</span>' + esc(L.faixas[i].musica.titulo) + '</button>';
      if (p && p.pausaDepois) lista += '<div class="o-pausa">' + esc(p.pausaDepois) + '</div>';
    }
    lista += '</div>';
  }
  lugar.innerHTML =
    '<div class="o-fundo" data-o="fechar"><div class="o-caixa" data-o="nada">' +
    '<h2>' + esc(f.musica.titulo) + '</h2>' +
    '<div class="o-linha"><span>Tom' + (tom ? ': <b>' + esc(tom) + '</b>' : '') + (passos ? ' <small>(só agora)</small>' : '') + '</span>' +
    '<button class="o-redondo" data-o="tom-" aria-label="Baixar meio tom">−</button><button class="o-redondo" data-o="tom+" aria-label="Subir meio tom">+</button></div>' +
    '<div class="o-linha"><span>Tamanho da letra: <b>' + config.tamanho + '</b></span>' +
    '<button class="o-redondo" data-o="fonte-" aria-label="Diminuir">−</button><button class="o-redondo" data-o="fonte+" aria-label="Aumentar">+</button></div>' +
    '<button class="o-caixinha" data-o="soLetra">' + (config.soLetra ? '☑︎' : '☐︎') + ' Só a letra (esconder cifras)</button>' +
    '<button class="o-caixinha" data-o="duas">' + (config.duasPaginas ? '☑︎' : '☐︎') + ' Duas páginas com o iPad deitado</button>' +
    lista +
    '<div class="o-botoes"><button class="botao perigo" data-o="sair">Sair do leitor</button><button class="botao" data-o="fechar">Fechar</button></div>' +
    '</div></div>';
  const caixa = lugar.querySelector('.o-lista') as HTMLElement | null;
  const atual = lugar.querySelector('.o-musica.atual') as HTMLElement | null;
  if (caixa && atual) caixa.scrollTop = Math.max(0, atual.offsetTop - caixa.offsetTop - 80);
}

document.addEventListener('click', e => {
  if (!L || !L.opcoes) return;
  let el = e.target as HTMLElement | null;
  while (el && !el.getAttribute('data-o')) el = el.parentElement;
  if (!el) return;
  const o = el.getAttribute('data-o');
  const f = L.faixas[L.atual];
  if (o === 'nada') return;
  if (o === 'fechar') { L.opcoes = false; desenharOpcoes(); return; }
  if (o === 'sair') { const r = L.repertorio; mostrar(r ? { nome: 'repertorio', id: r.id } : { nome: 'lista' }); return; }
  if (o === 'ir') { L.opcoes = false; desenharOpcoes(); irPara(Number(el.getAttribute('data-i'))); return; }
  if (o === 'tom-' || o === 'tom+') L.tons[f.musica.id] = (L.tons[f.musica.id] || 0) + (o === 'tom+' ? 1 : -1);
  if (o === 'fonte-') config.tamanho = Math.max(1, config.tamanho - 1);
  if (o === 'fonte+') config.tamanho = Math.min(5, config.tamanho + 1);
  if (o === 'soLetra') config.soLetra = !config.soLetra;
  if (o === 'duas') config.duasPaginas = !config.duasPaginas;
  gravarConfig(config);
  montarMusica();
  desenharOpcoes();
}, false);

function mostrarInstrucoes() {
  const lugar = document.getElementById('l-modal');
  if (!lugar) return;
  lugar.innerHTML =
    '<div class="instrucoes" id="instrucoes">' +
    '<div class="i-linha i-topo"><div class="i-caixa">Toque no título:<br>música anterior</div><div class="i-caixa">Toque aqui:<br>próxima música</div></div>' +
    '<div class="i-linha i-meio"><div class="i-caixa"><i class="tri esq"></i><br>Voltar página</div><div class="i-caixa"><i class="tri"></i><br>Avançar página</div></div>' +
    '<p>Embaixo: SAIR fecha o leitor. A engrenagem, ao lado da hora, muda o tom e o tamanho da letra.</p>' +
    '<button class="botao">Entendi</button></div>';
  toque(document.getElementById('instrucoes'), () => {
    config.instrucoesVistas = true;
    gravarConfig(config);
    if (L && !L.opcoes) lugar.innerHTML = '';
  });
}

// Pedal Bluetooth/USB: chega como tecla (setas, Page Up/Down, espaço, Enter).
document.addEventListener('keydown', e => {
  if (!L || L.opcoes) return;
  const k = e.keyCode;
  if (k === 34 || k === 39 || k === 40 || k === 32 || k === 13) { e.preventDefault(); avancarPagina(); }
  else if (k === 33 || k === 37 || k === 38) { e.preventDefault(); voltarPagina(); }
}, false);

// Girar o iPad: monta as páginas de novo para o novo tamanho.
let girando = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(girando);
  girando = window.setTimeout(() => { if (L) montarMusica(); }, 250);
}, false);

// ---------- Versão nova do leitor ----------
// O iPad guarda esta página para abrir sem internet (application cache). Quando sai versão nova,
// ela baixa sozinha; aqui ela entra assim que o leitor não estiver aberto.
const cache = (window as unknown as { applicationCache?: { status: number; UPDATEREADY: number; swapCache(): void; addEventListener(t: string, f: () => void): void } }).applicationCache;
if (cache) {
  cache.addEventListener('updateready', () => {
    if (tela.nome !== 'leitor') { try { cache.swapCache(); } catch { /* segue com a atual */ } location.reload(); }
  });
}

// ---------- Começo ----------
if (sessaoGuardada()) {
  tela = { nome: 'lista' };
  desenhar();
} else desenhar();
