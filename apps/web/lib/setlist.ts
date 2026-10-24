// Setlist para imprimir ou salvar em PDF e mandar para alguém: a lista do repertório,
// com os blocos e as pausas como no setlist impresso da banda.
import type { ItemRepertorio, MusicaResumo } from './tipos';

export interface DadosSetlist {
  titulo: string;
  estilo: string;
  /** Quem montou o repertório. */
  edicao: string;
  /** Data da última alteração (ISO). Sem ela, usa hoje. */
  revisao?: string;
  numerar: boolean;
  itens: ItemRepertorio[];
  musicas: Map<string, MusicaResumo>;
}

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const MARCA = `<svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#ffd23f"/><path d="M50 89C45.5 89 42 86.6 39 83 29 71 16 53 16 35 16 20 32 12 50 12s34 8 34 23c0 18-13 36-23 48-3 3.6-6.5 6-11 6z" fill="#0b1d33"/><path d="M41 31v28l23-14z" fill="#ffd23f" stroke="#ffd23f" stroke-width="4" stroke-linejoin="round"/></svg>`;

const ESTILO = `
@page { margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cabeca { display: flex; align-items: center; gap: 22px; border-bottom: 1.5px solid #999; padding-bottom: 8px; margin-bottom: 16px; }
.logo { display: flex; align-items: center; gap: 7px; background: #0b1d33; color: #fff; border-radius: 8px; padding: 5px 12px 5px 6px; font-weight: 900; font-size: 19px; letter-spacing: -0.3px; }
.logo b { color: #ffd23f; }
.info { font-size: 12px; line-height: 1.6; }
.info span + span { margin-left: 14px; }
.musica { break-inside: avoid; margin: 0 0 9px; }
.musica .t { font-weight: 700; font-size: 17px; text-transform: uppercase; }
.musica .d { font-size: 12px; padding-left: 34px; margin-top: 1px; }
.musica .d b { font-size: 14px; }
.sem-numero .d { padding-left: 0; }
.bloco { break-after: avoid; background: #d3f9d8; color: #0b5a1f; font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: .02em; padding: 5px 10px; border-radius: 4px; margin: 18px 0 10px; }
.bloco:first-child { margin-top: 0; }
.pausa { break-inside: avoid; display: inline-block; background: #fff3bf; color: #c92a2a; font-weight: 800; font-size: 14px; padding: 2px 14px; border-radius: 4px; margin: 0 0 10px 34px; }
.sem-numero .pausa { margin-left: 0; }
`;

export function htmlDoSetlist(s: DadosSetlist) {
  const data = new Date(s.revisao || Date.now()).toLocaleDateString('pt-BR');
  let numero = 0;
  const linhas = s.itens.map(it => {
    if (it.momento) { numero = 0; return `<div class="bloco">${esc(it.momento)}</div>`; }
    if (it.pausa) return `<div class="pausa">${esc(it.pausa)}</div>`;
    const m = it.musicaId ? s.musicas.get(it.musicaId) : undefined;
    if (!m) return '';
    numero++;
    const detalhe = [m.artista ? esc(m.artista) : '', m.tom ? `<b>${esc(m.tom)}</b>` : '', m.capo ? `Capo ${m.capo}ª` : ''].filter(Boolean).join(' &bull; ');
    return `<div class="musica"><div class="t">${s.numerar ? numero + '. ' : ''}${esc(m.titulo)}</div>${detalhe ? `<div class="d">${detalhe}</div>` : ''}</div>`;
  }).join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Setlist - ${esc(s.titulo || 'Repertório')}</title>
<style>${ESTILO}</style>
</head>
<body class="${s.numerar ? '' : 'sem-numero'}">
<div class="cabeca">
  <div class="logo">${MARCA}<span>Palco<b>Livre</b></span></div>
  <div class="info">
    <div>Repertório: <b>${esc(s.titulo || 'Sem título')}</b></div>
    <div>${s.estilo ? `<span>Estilo: <b>${esc(s.estilo)}</b></span>` : ''}${s.edicao ? `<span>Edição: <b>${esc(s.edicao)}</b></span>` : ''}<span>Revisão: <b>${data}</b></span></div>
  </div>
</div>
${linhas}
</body>
</html>`;
}

/** Abre a janela de impressão do navegador, onde dá para escolher "Salvar como PDF". */
export function imprimirSetlist(s: DadosSetlist) {
  const html = htmlDoSetlist(s);
  // Uma janela só com o setlist. Se o navegador bloquear a janela, imprime por um quadro escondido.
  const janela = window.open('', '_blank');
  if (janela) {
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.onafterprint = () => janela.close();
    janela.focus();
    setTimeout(() => janela.print(), 250);
    return;
  }
  const quadro = document.createElement('iframe');
  quadro.setAttribute('aria-hidden', 'true');
  quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(quadro);
  const doc = quadro.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    quadro.contentWindow!.focus();
    quadro.contentWindow!.print();
    setTimeout(() => quadro.remove(), 1000);
  }, 250);
}
