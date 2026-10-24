'use client';

// Campo Artista com sugestões enquanto digita: primeiro os artistas das suas músicas, depois uma lista de artistas
// conhecidos (funciona sem internet) e, com internet, a busca no MusicBrainz, a base aberta de música do mundo todo.
import { semAcento } from '@palco/cifra';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ARTISTAS } from '@/lib/artistas';

interface Sugestao { nome: string; detalhe: string }

const PAISES: Record<string, string> = {
  BR: 'Brasil', PT: 'Portugal', US: 'EUA', GB: 'Reino Unido', IE: 'Irlanda', CA: 'Canadá', AU: 'Austrália', AR: 'Argentina',
  MX: 'México', ES: 'Espanha', IT: 'Itália', FR: 'França', DE: 'Alemanha', SE: 'Suécia', NO: 'Noruega', FI: 'Finlândia',
  JM: 'Jamaica', CO: 'Colômbia', CU: 'Cuba', PR: 'Porto Rico', UY: 'Uruguai', CL: 'Chile', JP: 'Japão', KR: 'Coreia do Sul',
};
const TIPOS: Record<string, string> = { Group: 'banda', Person: 'artista', Orchestra: 'orquestra', Choir: 'coral' };

/** 0: começa com o que foi digitado; 1: alguma palavra começa; 2: aparece no meio; -1: não combina. */
function combina(busca: string, nome: string) {
  const n = semAcento(nome);
  if (n.startsWith(busca)) return 0;
  if (n.split(/[\s&/-]+/).some(p => p.startsWith(busca))) return 1;
  return n.includes(busca) ? 2 : -1;
}

function procurar(busca: string, nomes: string[], detalhe: string): Sugestao[] {
  return nomes
    .map(nome => ({ nome, nota: combina(busca, nome) }))
    .filter(x => x.nota >= 0)
    .sort((a, b) => a.nota - b.nota || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(x => ({ nome: x.nome, detalhe }));
}

async function buscarNaInternet(texto: string, sinal: AbortSignal): Promise<Sugestao[]> {
  const limpo = texto.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').trim();
  if (!limpo) return [];
  const consulta = `(${limpo}) OR (${limpo}*)`;
  const r = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(consulta)}&fmt=json&limit=10`, { signal: sinal });
  if (!r.ok) return [];
  const dados = (await r.json()) as { artists?: { name: string; score: number; type?: string; country?: string; disambiguation?: string }[] };
  return (dados.artists ?? [])
    .filter(a => a.score >= 60)
    .map(a => ({
      nome: a.name,
      detalhe: [a.type ? TIPOS[a.type] : '', a.country ? PAISES[a.country] ?? a.country : '', a.disambiguation ?? ''].filter(Boolean).join(' · '),
    }));
}

export function CampoArtista({ valor, aoMudar, meus, estilo }: { valor: string; aoMudar: (v: string) => void; meus: string[]; estilo?: CSSProperties }) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [daInternet, setDaInternet] = useState<{ busca: string; lista: Sugestao[] }>({ busca: '', lista: [] });
  const [buscando, setBuscando] = useState(false);
  const caixa = useRef<HTMLUListElement>(null);
  const busca = semAcento(valor.trim());

  // Espera a pessoa parar de digitar antes de perguntar na internet.
  useEffect(() => {
    if (!aberto || busca.length < 3) { setBuscando(false); return; }
    const controle = new AbortController();
    setBuscando(true);
    const t = setTimeout(() => {
      buscarNaInternet(valor.trim(), controle.signal)
        .then(lista => setDaInternet({ busca, lista }), () => undefined)
        .finally(() => { if (!controle.signal.aborted) setBuscando(false); });
    }, 450);
    return () => { clearTimeout(t); controle.abort(); };
  }, [busca, aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const sugestoes = useMemo(() => {
    if (!busca) return [];
    const vistos = new Set<string>();
    const unicas = (l: Sugestao[]) => l.filter(s => {
      const k = semAcento(s.nome);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    const online = daInternet.busca && busca.startsWith(daInternet.busca) ? daInternet.lista.filter(s => combina(busca, s.nome) >= 0 || daInternet.busca === busca) : [];
    // Um artista da lista que também veio da internet ganha o país e o tipo que a internet trouxe.
    const detalhes = new Map(online.map(s => [semAcento(s.nome), s.detalhe]));
    const conhecidos = procurar(busca, ARTISTAS, '').map(s => ({ ...s, detalhe: detalhes.get(semAcento(s.nome)) ?? '' }));
    return [
      ...unicas(procurar(busca, meus, 'nas suas músicas')).slice(0, 5),
      ...unicas(conhecidos).slice(0, 6),
      ...unicas(online).slice(0, 8),
    ].filter(s => semAcento(s.nome) !== busca || s.detalhe);
  }, [busca, meus, daInternet]);

  useEffect(() => { setAtivo(-1); }, [busca]);
  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [ativo]);

  const escolher = (s: Sugestao) => { aoMudar(s.nome); setAberto(false); };
  const mostrar = aberto && (sugestoes.length > 0 || buscando);

  return (
    <div className="campo-artista" style={estilo}>
      <input
        className="campo"
        placeholder="Artista"
        value={valor}
        onChange={e => { aoMudar(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && sugestoes.length) { e.preventDefault(); setAberto(true); setAtivo(i => (i + 1) % sugestoes.length); }
          else if (e.key === 'ArrowUp' && sugestoes.length) { e.preventDefault(); setAtivo(i => (i <= 0 ? sugestoes.length - 1 : i - 1)); }
          else if (e.key === 'Enter' && mostrar && ativo >= 0) { e.preventDefault(); escolher(sugestoes[ativo]); }
          else if (e.key === 'Escape') setAberto(false);
        }}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls="sugestoes-artista"
        aria-autocomplete="list"
        aria-label="Artista"
        autoComplete="off"
      />
      {mostrar ? (
        <ul className="sugestoes" id="sugestoes-artista" role="listbox" ref={caixa}>
          {sugestoes.map((s, i) => (
            <li
              key={s.nome + i}
              role="option"
              aria-selected={i === ativo}
              className={i === ativo ? 'ativo' : undefined}
              onMouseDown={e => { e.preventDefault(); escolher(s); }}
              onMouseEnter={() => setAtivo(i)}
            >
              <span>{s.nome}</span>
              {s.detalhe ? <span className="detalhe">{s.detalhe}</span> : null}
            </li>
          ))}
          {buscando ? <li className="buscando" aria-disabled>Buscando na internet…</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
