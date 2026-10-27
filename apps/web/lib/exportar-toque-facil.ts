// Favorito (bookmarklet) que roda dentro do site do Toque Fácil, na conta da própria pessoa, porque o
// Toque Fácil não tem botão de exportar. Na página "Minhas músicas", ele passa pelas páginas da lista
// usando os próprios botões de página do site, abre o editor de cada música (como quem clica em cada uma)
// e baixa tudo num arquivo que a tela Importar do Palco Livre entende.
// Fica como texto porque roda lá, não aqui: não pode usar nada de fora desta função.
const CODIGO = String.raw`(async () => {
  const esperar = ms => new Promise(ok => setTimeout(ok, ms));
  const noToqueFacil = /(^|\.)toquefacil\.com\.br$/.test(location.hostname);
  if (!noToqueFacil || !/^\/minhasmusicas/.test(location.pathname)) {
    if (noToqueFacil) {
      if (confirm('Para copiar as músicas, abra a página Minhas músicas. Abrir agora? Depois clique de novo no favorito.')) location.href = '/minhasmusicas';
    } else alert('Abra o site do Toque Fácil, entre na sua conta e clique em Músicas. Depois clique de novo neste favorito.');
    return;
  }
  if (window.__palcoLivre) return;
  window.__palcoLivre = true;

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
    const filtro = [...document.querySelectorAll('select[name="Estilo"], select[name="Artista"]')].some(s => s.selectedIndex > 0);
    const busca = document.querySelector('input[name="Busca"]');
    if (filtro || (busca && busca.value.trim())) throw new Error('A lista está filtrada. Volte para "Todos os Estilos" e "Todos os Artistas", apague a busca e clique de novo no favorito.');

    // 1. A lista: todas as páginas, pelo mesmo botão de página do site.
    const paginacao = () => {
      const a = document.querySelector('#Paginacao a[onclick*="MoverPagina"]');
      const m = a && /MoverPagina\(\s*\d+\s*,\s*(\d+)\s*,\s*'([^']*)'/.exec(a.getAttribute('onclick'));
      return m ? { total: +m[1], chave: m[2] } : null;
    };
    const enderecos = new Map();
    const lerLista = () => {
      for (const a of document.querySelectorAll('#Detalhes a[href*="/editormusica/"]')) {
        const tr = a.closest('tr');
        enderecos.set(a.href, (tr && tr.querySelector('b') ? tr.querySelector('b').textContent : '').trim());
      }
    };
    const pag = paginacao();
    const total = pag ? pag.total : 1;
    for (let p = 1; p <= total; p++) {
      mostrar(linha('Lendo a lista de músicas: página ' + p + ' de ' + total + '…'));
      if (pag) {
        const corpo = document.getElementById('Detalhes');
        if (corpo) corpo.replaceChildren();
        window.MoverPagina(p, total, (paginacao() || pag).chave);
        const inicio = Date.now();
        while (!document.querySelector('#Detalhes a[href*="/editormusica/"]')) {
          if (Date.now() - inicio > 30000) throw new Error('A página ' + p + ' da lista não carregou. Confira a internet e tente de novo.');
          await esperar(200);
        }
        await esperar(300);
      }
      lerLista();
    }
    const lista = [...enderecos.keys()];
    if (!lista.length) throw new Error('Não achei nenhuma música na lista.');

    // 2. Cada música: o editor tem título, artista, tom, estilo, capotraste e a letra cifrada.
    const lerMusica = async endereco => {
      for (let tentativa = 1; ; tentativa++) {
        try {
          const r = await fetch(endereco, { credentials: 'same-origin' });
          if (!r.ok) throw new Error('erro ' + r.status);
          const d = new DOMParser().parseFromString(await r.text(), 'text/html');
          const campo = nome => d.querySelector('[name="' + nome + '"]');
          const opcao = nome => {
            const o = d.querySelector('select[name="' + nome + '"] option[selected]');
            return o && !/^(0|X)$/.test(o.value) ? o.textContent.trim() : '';
          };
          if (!campo('Titulo') || !campo('LetraCifra')) throw new Error('o editor não abriu');
          return {
            titulo: campo('Titulo').value.trim(), artista: opcao('Artista'), tom: opcao('Tom'), estilo: opcao('Estilo'),
            capo: campo('CasaCapo') ? campo('CasaCapo').value : '', letra: campo('LetraCifra').value,
          };
        } catch (e) {
          if (tentativa >= 3) throw e;
          await esperar(2000 * tentativa);
        }
      }
    };
    const musicas = [];
    const falhas = [];
    let proxima = 0;
    let feitas = 0;
    let errosSeguidos = 0;
    const trabalhar = async () => {
      while (proxima < lista.length) {
        const i = proxima++;
        try {
          musicas[i] = await lerMusica(lista[i]);
          errosSeguidos = 0;
        } catch (e) {
          falhas.push({ titulo: enderecos.get(lista[i]), endereco: lista[i], erro: String(e && e.message || e) });
          if (++errosSeguidos >= 8) throw new Error('Várias músicas seguidas não abriram. Talvez a sua conta do Toque Fácil tenha saído: entre de novo e clique outra vez no favorito.');
        }
        feitas++;
        mostrar(linha('Copiando as músicas: ' + feitas + ' de ' + lista.length + '…'), linha('Pode deixar rodando. Não feche esta aba.', 'opacity:.75;font-size:14px'));
      }
    };
    await Promise.all([trabalhar(), trabalhar()]);

    // 3. O arquivo.
    const copiadas = musicas.filter(Boolean);
    const arquivo = { origem: 'toque-facil', versao: 1, exportadoEm: new Date().toISOString(), musicas: copiadas, falhas };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(arquivo)], { type: 'application/json' }));
    a.download = 'musicas-toque-facil.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    const partes = [
      linha('Pronto! ' + copiadas.length + ' músicas foram salvas no arquivo musicas-toque-facil.json, na pasta Downloads.'),
      linha('Agora abra o Palco Livre, vá em Músicas › Importar e escolha esse arquivo.', 'margin-top:8px'),
    ];
    if (falhas.length) partes.push(linha(falhas.length + ' não abriram: ' + falhas.map(f => f.titulo).join(', ') + '.', 'margin-top:8px;color:#ffb3b3'));
    mostrar(...partes, botaoFechar());
  } catch (e) {
    mostrar(linha('Não deu para terminar: ' + (e && e.message || e)), botaoFechar());
  } finally {
    window.__palcoLivre = false;
  }
})();`;

/** O endereço do favorito. */
export const FAVORITO_TOQUE_FACIL = 'javascript:' + encodeURIComponent(CODIGO.replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*/g, '\n'));
