// Cópia das músicas e repertórios guardada no aparelho (IndexedDB), para o site
// abrir e tocar sem internet depois de ter sido usado conectado uma vez.

const BANCO = 'palco-livre';
const TABELA = 'copia';

let aberto: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (!aberto) {
    aberto = new Promise((ok, falha) => {
      const req = indexedDB.open(BANCO, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(TABELA);
      req.onsuccess = () => ok(req.result);
      req.onerror = () => falha(req.error);
    });
    aberto.catch(() => { aberto = null; });
  }
  return aberto;
}

async function pedido<T>(modo: IDBTransactionMode, fazer: (t: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const tx = db.transaction(TABELA, modo);
    const req = fazer(tx.objectStore(TABELA));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => falha(tx.error);
    tx.onabort = () => falha(tx.error);
  });
}

/** Sem IndexedDB (aba anônima antiga, por exemplo) tudo vira "não tem cópia". */
export async function lerCopia<T>(chave: string): Promise<T | undefined> {
  try { return await pedido<T>('readonly', t => t.get(chave)); } catch { return undefined; }
}

export async function lerCopias<T>(chaves: string[]): Promise<(T | undefined)[]> {
  try {
    const db = await abrir();
    return await new Promise((ok, falha) => {
      const tx = db.transaction(TABELA, 'readonly');
      const loja = tx.objectStore(TABELA);
      const reqs = chaves.map(c => loja.get(c) as IDBRequest<T | undefined>);
      tx.oncomplete = () => ok(reqs.map(r => r.result));
      tx.onerror = () => falha(tx.error);
    });
  } catch {
    return chaves.map(() => undefined);
  }
}

export async function gravarCopias(itens: [string, unknown][]): Promise<void> {
  if (!itens.length) return;
  try { await pedido('readwrite', t => { for (const [c, v] of itens) t.put(v, c); }); } catch { /* sem espaço ou sem IndexedDB */ }
}

export async function apagarCopias(chaves: string[]): Promise<void> {
  if (!chaves.length) return;
  try { await pedido('readwrite', t => { for (const c of chaves) t.delete(c); }); } catch { /* idem */ }
}

export async function chavesDaCopia(): Promise<string[]> {
  try { return ((await pedido<IDBValidKey[]>('readonly', t => t.getAllKeys())) ?? []).map(String); } catch { return []; }
}

export async function limparCopia(): Promise<void> {
  try { await pedido('readwrite', t => { t.clear(); }); } catch { /* idem */ }
}
