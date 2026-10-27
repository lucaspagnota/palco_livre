// Favorito (bookmarklet) que roda dentro do site do Toque Fácil, na conta da própria pessoa, porque o
// Toque Fácil não tem botão de exportar. Na página "Minhas músicas" ele copia as músicas; na página
// "Meus repertórios", os repertórios. Passa pelas páginas da lista usando os próprios botões de página
// do site, abre o editor de cada item (como quem clica em cada um) e baixa tudo num arquivo que a tela
// Importar do Palco Livre entende.
// Dos repertórios, guarda os pedaços do editor como vieram (sequência e impressões): quem entende o
// conteúdo é a tela Importar (lib/importar-repertorios.ts), que dá para corrigir sem rodar isto de novo.
// Fica como texto porque roda lá, não aqui: não pode usar nada de fora desta função.
const CODIGO = String.raw`(async () => {
  const esperar = ms => new Promise(ok => setTimeout(ok, ms));
  const noToqueFacil = /(^|\.)toquefacil\.com\.br$/.test(location.hostname);
  const modo = /^\/minhasmusicas/.test(location.pathname) ? 'musicas' : /^\/meusrepertorios/.test(location.pathname) ? 'repertorios' : '';
  if (!noToqueFacil || !modo) {
    alert(noToqueFacil
      ? 'Abra a página Músicas (para copiar as músicas) ou Repertórios (para copiar os repertórios) e clique de novo no favorito.'
      : 'Abra o site do Toque Fácil, entre na sua conta e clique em Músicas ou Repertórios. Depois clique de novo neste favorito.');
    return;
  }
  if (window.__palcoLivre) return;
  window.__palcoLivre = true;
  const MUSICAS = modo === 'musicas';
  const nomes = MUSICAS ? 'músicas' : 'repertórios';
  const arquivoNome = MUSICAS ? 'musicas-toque-facil.json' : 'repertorios-toque-facil.json';

  const painel = document.createElement('div');
  painel.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;background:#0b1d33;color:#fff;font:16px/1.45 Arial,sans-serif;padding:16px 20px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.45);max-width:380px';
  document.body.appendChild(painel);
  const mostrar = (...partes) => {
    painel.replaceChildren();
    const marca = document.createElement('b');
    marca.textContent = 'Palco Livre';
    marca.style.cssText = 'color:#ffd23f;display:block;margin-bottom:6px';
    painel.append(marca, ...partes);
  };
  const linha = (texto, estilo) => { const p = document.createElement('div'); p.textContent = texto; if (estilo) p.style.cssText = estilo; return p; };
  const botaoFechar = () => {
    const b = document.createElement('button');
    b.textContent = 'Fechar';
    b.style.cssText = 'margin-top:10px;background:#ffd23f;color:#0b1d33;border:0;border-radius:999px;padding:6px 16px;font-weight:700;cursor:pointer';
    b.onclick = () => painel.remove();
    return b;
  };

  try {
    const filtro = [...document.querySelectorAll('select[name="Estilo"], select[name="Artista"], select[name="TipoRep"]')].some(s => s.selectedIndex > 0);
    const busca = document.querySelector('input[name="Busca"]');
    if (filtro || (busca && busca.value.trim())) {
      throw new Error(MUSICAS
        ? 'A lista está filtrada. Volte para "Todos os Estilos" e "Todos os Artistas", apague a busca e clique de novo no favorito.'
        : 'A lista está filtrada. Volte para "Todos os estilos" e "Meus repertórios", apague a busca e clique de novo no favorito.');
    }

    // 1. A lista: todas as páginas, pelo mesmo botão de página do site.
    const LINK = MUSICAS ? '#Detalhes a[href*="/editormusica/"]' : '#Detalhes a[href*="/editorrepertorio/"]';
    const paginacao = () => {
      const a = document.querySelector('#Paginacao a[onclick*="MoverPagina"]');
      const m = a && /MoverPagina\(\s*\d+\s*,\s*(\d+)\s*(?:,\s*'([^']*)')?/.exec(a.getAttribute('onclick'));
      return m ? { total: +m[1], chave: m[2] } : null;
    };
    const enderecos = new Map();
    const lerLista = () => {
      for (const a of document.querySelectorAll(LINK)) {
        const tr = a.closest('tr');
        enderecos.set(a.href, (tr && tr.querySelector('b') ? tr.querySelector('b').textContent : '').trim());
      }
    };
    const pag = paginacao();
    const total = pag ? pag.total : 1;
    for (let p = 1; p <= total; p++) {
      mostrar(linha('Lendo a lista de ' + nomes + ': página ' + p + ' de ' + total + '…'));
      if (pag) {
        const corpo = document.getElementById('Detalhes');
        if (corpo) corpo.replaceChildren();
        const chave = (paginacao() || pag).chave;
        if (chave === undefined) window.MoverPagina(p, total);
        else window.MoverPagina(p, total, chave);
        const inicio = Date.now();
        while (!document.querySelector(LINK)) {
          if (Date.now() - inicio > 30000) throw new Error('A página ' + p + ' da lista não carregou. Confira a internet e tente de novo.');
          await esperar(200);
        }
        await esperar(300);
      }
      lerLista();
    }
    const lista = [...enderecos.keys()];
    if (!lista.length) throw new Error('Não achei nenhum item na lista de ' + nomes + '.');

    // 2. Cada item, pelo editor do site.
    const abrir = async endereco => {
      const r = await fetch(endereco, { credentials: 'same-origin' });
      if (!r.ok) throw new Error('erro ' + r.status);
      return new DOMParser().parseFromString(await r.text(), 'text/html');
    };
    const opcao = (d, nome) => {
      const o = d.querySelector('select[name="' + nome + '"] option[selected]');
      return o && !/^(0|X)$/.test(o.value) ? o.textContent.trim() : '';
    };
    // Música: o editor tem título, artista, tom, estilo, capotraste e a letra cifrada.
    const lerMusica = async endereco => {
      const d = await abrir(endereco);
      const campo = nome => d.querySelector('[name="' + nome + '"]');
      if (!campo('Titulo') || !campo('LetraCifra')) throw new Error('o editor não abriu');
      return {
        titulo: campo('Titulo').value.trim(), artista: opcao(d, 'Artista'), tom: opcao(d, 'Tom'), estilo: opcao(d, 'Estilo'),
        capo: campo('CasaCapo') ? campo('CasaCapo').value : '', letra: campo('LetraCifra').value,
      };
    };
    // Repertório: título, estilo e a sequência das músicas, com as listas de impressão (lá o título e o artista vêm inteiros).
    const pedacos = d => {
      const titulo = d.querySelector('[name="Titulo"]');
      const seq = d.getElementById('SequenciaMusicas');
      if (!titulo || !seq) return null;
      const html = id => { const e = d.getElementById(id); return e ? e.outerHTML : ''; };
      const auto = d.getElementById('chAutoNumeracao');
      return {
        titulo: titulo.value.trim(), estilo: opcao(d, 'Estilo'), numerar: !!(auto && auto.hasAttribute('checked')),
        musicas: seq.querySelectorAll('option').length, sequencia: seq.outerHTML, lista: html('imprRep'), setlist: html('imprSL'),
      };
    };
    // Se a sequência for montada depois que a página abre, abre o editor escondido e espera ela aparecer.
    const pelaPagina = endereco => new Promise((ok, falha) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;opacity:0';
      const prazo = setTimeout(() => { f.remove(); falha(new Error('o editor não abriu')); }, 40000);
      f.onload = async () => {
        try {
          const d = f.contentDocument;
          for (let i = 0; i < 75 && !d.querySelector('#SequenciaMusicas option'); i++) await esperar(200);
          const r = pedacos(d);
          if (!r) throw new Error('o editor não abriu');
          ok(r);
        } catch (e) { falha(e); } finally { clearTimeout(prazo); f.remove(); }
      };
      f.src = endereco;
      document.body.appendChild(f);
    });
    const lerRepertorio = async endereco => {
      const r = pedacos(await abrir(endereco));
      if (!r) throw new Error('o editor não abriu');
      return r.musicas ? r : pelaPagina(endereco);
    };
    const ler = async endereco => {
      for (let tentativa = 1; ; tentativa++) {
        try {
          return await (MUSICAS ? lerMusica(endereco) : lerRepertorio(endereco));
        } catch (e) {
          if (tentativa >= 3) throw e;
          await esperar(2000 * tentativa);
        }
      }
    };
    const itens = [];
    const falhas = [];
    let proxima = 0;
    let feitas = 0;
    let errosSeguidos = 0;
    const trabalhar = async () => {
      while (proxima < lista.length) {
        const i = proxima++;
        try {
          itens[i] = await ler(lista[i]);
          if (!MUSICAS) itens[i].endereco = lista[i];
          errosSeguidos = 0;
        } catch (e) {
          falhas.push({ titulo: enderecos.get(lista[i]), endereco: lista[i], erro: String(e && e.message || e) });
          if (++errosSeguidos >= 8) throw new Error('Vários itens seguidos não abriram. Talvez a sua conta do Toque Fácil tenha saído: entre de novo e clique outra vez no favorito.');
        }
        feitas++;
        mostrar(linha('Copiando os ' + nomes + ': ' + feitas + ' de ' + lista.length + '…'), linha('Pode deixar rodando. Não feche esta aba.', 'opacity:.75;font-size:14px'));
      }
    };
    await Promise.all([trabalhar(), trabalhar()]);

    // 3. O arquivo.
    const copiados = itens.filter(Boolean);
    const arquivo = { origem: 'toque-facil', tipo: modo, versao: 1, exportadoEm: new Date().toISOString(), falhas };
    arquivo[modo] = copiados;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(arquivo)], { type: 'application/json' }));
    a.download = arquivoNome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    const partes = [
      linha('Pronto! ' + copiados.length + ' ' + nomes + (MUSICAS ? ' foram salvas' : ' foram salvos') + ' no arquivo ' + arquivoNome + ', na pasta Downloads.'),
      linha(MUSICAS
        ? 'Agora abra o Palco Livre, vá em Músicas › Importar e escolha esse arquivo.'
        : 'Agora abra o Palco Livre, vá em Músicas › Importar e escolha esse arquivo. Importe as músicas antes dos repertórios.', 'margin-top:8px'),
    ];
    if (falhas.length) partes.push(linha((falhas.length === 1 ? '1 não abriu: ' : falhas.length + ' não abriram: ') + falhas.map(f => f.titulo).join(', ') + '.', 'margin-top:8px;color:#ffb3b3'));
    mostrar(...partes, botaoFechar());
  } catch (e) {
    mostrar(linha('Não deu para terminar: ' + (e && e.message || e)), botaoFechar());
  } finally {
    window.__palcoLivre = false;
  }
})();`;

/** O endereço do favorito. */
export const FAVORITO_TOQUE_FACIL = 'javascript:' + encodeURIComponent(CODIGO.replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*/g, '\n'));
