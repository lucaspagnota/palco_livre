// Pedal Bluetooth/USB: o Android e o iPad entregam o pedal como um teclado.
// Por isso qualquer marca funciona: o app só escuta as teclas que chegam.
// expo-key-event precisa do app instalado (APK); no Expo Go o leitor funciona por toque.
import { useRef } from 'react';

type KeyLib = typeof import('expo-key-event');
let lib: KeyLib | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('expo-key-event') as KeyLib;
} catch {
  lib = null;
}

export const pedalDisponivel = lib !== null;

/** Chama aoApertar com o nome da tecla ("PageDown", "ArrowRight"...). Ignora o pedal "quicando". */
export function usePedal(aoApertar: (tecla: string) => void) {
  const ultima = useRef({ tecla: '', em: 0 });
  const fn = useRef(aoApertar);
  fn.current = aoApertar;
  if (!lib) return;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  lib.useKeyEventListener(evento => {
    if (!('key' in evento) || !evento.key || evento.eventType !== 'press' || evento.repeat) return;
    const agora = Date.now();
    if (evento.key === ultima.current.tecla && agora - ultima.current.em < 200) return;
    ultima.current = { tecla: evento.key, em: agora };
    fn.current(evento.key);
  }, { listenOnMount: true, preventReload: true });
}

const NOMES: Record<string, string> = {
  PageDown: 'Page Down', PageUp: 'Page Up', ArrowRight: 'Seta →', ArrowLeft: 'Seta ←', ArrowUp: 'Seta ↑', ArrowDown: 'Seta ↓',
  Space: 'Espaço', ' ': 'Espaço', Enter: 'Enter', '24': 'Volume +', '25': 'Volume −', '85': 'Play/Pause',
  '87': 'Próxima faixa', '88': 'Faixa anterior', '126': 'Play', '127': 'Pause', AudioVolumeUp: 'Volume +',
  AudioVolumeDown: 'Volume −', MediaTrackNext: 'Próxima faixa', MediaTrackPrevious: 'Faixa anterior', MediaPlayPause: 'Play/Pause',
};

/** Nome amigável de uma tecla do pedal. */
export const nomeDaTecla = (t: string) => NOMES[t] ?? (t.length === 1 ? t.toUpperCase() : t);
