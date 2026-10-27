// Letra cifrada que vem do Toque Fácil. O texto é igual ao nosso (acorde em cima, letra embaixo, [Partes]),
// só as marcas mudam: lá, cada linha do refrão começa com "|", a 2ª voz com ":" e a anotação com "#"
// (a 2ª voz e a anotação podem vir logo depois do "|"). Aqui viram {refrão}, {2ª voz} e "//".
import { MARK, isTabLine } from './texto';

export function deToqueFacil(letra: string): string {
  const out: string[] = [];
  let refrao = false;
  let voz2 = false;
  for (const linha of letra.replace(/\r\n?/g, '\n').split('\n')) {
    let resto = linha;
    let r = false;
    let v = false;
    let nota = false;
    // Tablatura começando com "|" (sem o nome da corda) não é refrão.
    if (!isTabLine(linha)) {
      if (resto.startsWith('|')) { r = true; resto = resto.slice(1); }
      if (resto.startsWith(':')) { v = true; resto = resto.slice(1); }
      else if (resto.startsWith('#')) { nota = true; resto = resto.slice(1); }
    }
    // Linha em branco não quebra o refrão nem a 2ª voz.
    if (!resto.trim() && !r && !v) { out.push(''); continue; }
    if (voz2 && !v) out.push(MARK.voz2End);
    if (refrao && !r) out.push(MARK.refraoEnd);
    if (!refrao && r) out.push(MARK.refraoStart);
    if (!voz2 && v) out.push(MARK.voz2Start);
    refrao = r;
    voz2 = v;
    out.push(nota ? '// ' + resto.trim() : resto);
  }
  if (voz2) out.push(MARK.voz2End);
  if (refrao) out.push(MARK.refraoEnd);
  return fecharAntesDoBranco(out).join('\n');
}

/** "{/refrão}" logo depois de linhas em branco fica antes delas, colado na última linha do refrão. */
function fecharAntesDoBranco(linhas: string[]) {
  const out: string[] = [];
  for (const l of linhas) {
    if (l === MARK.refraoEnd || l === MARK.voz2End) {
      let brancos = 0;
      while (out.length && out[out.length - 1] === '') { out.pop(); brancos++; }
      out.push(l, ...Array(brancos).fill(''));
    } else out.push(l);
  }
  return out;
}
