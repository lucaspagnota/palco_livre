// O Safari do iPad 2 (iOS 9) não tem algumas funções que o motor da cifra usa. Aqui elas são criadas
// só quando faltam; nos navegadores novos nada muda.
/* eslint-disable @typescript-eslint/no-explicit-any */
const S = String.prototype as any;
const A = Array.prototype as any;

if (!S.matchAll) {
  S.matchAll = function (re: RegExp) {
    const r = new RegExp(re.source, 'g' + (re.ignoreCase ? 'i' : '') + (re.multiline ? 'm' : ''));
    const out: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = r.exec(this))) {
      out.push(m);
      if (m[0] === '') r.lastIndex++;
    }
    return out;
  };
}

if (!A.flat) {
  A.flat = function () {
    const out: unknown[] = [];
    for (let i = 0; i < this.length; i++) {
      if (Array.isArray(this[i])) for (let j = 0; j < this[i].length; j++) out.push(this[i][j]);
      else out.push(this[i]);
    }
    return out;
  };
}

if (!A.flatMap) {
  A.flatMap = function (fn: (v: unknown, i: number, a: unknown[]) => unknown, eu?: unknown) {
    return A.flat.call(A.map.call(this, fn, eu));
  };
}

if (!A.includes) {
  A.includes = function (v: unknown) { return A.indexOf.call(this, v) >= 0; };
}

if (!S.includes) {
  S.includes = function (v: string) { return S.indexOf.call(this, v) >= 0; };
}

export {};
