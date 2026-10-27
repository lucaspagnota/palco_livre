// Site Palco Livre num arquivo só (modo demonstração): as mesmas telas do Next, com navegação em memória.
import { createRoot } from 'react-dom/client';
import { DadosProvider } from '@/lib/dados';
import LayoutSite from '@/app/(site)/layout';
import Conta from '@/app/(site)/conta/page';
import EditorGrupo from '@/app/(site)/grupos/editor/page';
import Grupos from '@/app/(site)/grupos/page';
import EditorMusica from '@/app/(site)/musicas/editor/page';
import ImportarMusicas from '@/app/(site)/musicas/importar/page';
import Musicas from '@/app/(site)/musicas/page';
import EditorRepertorio from '@/app/(site)/repertorios/editor/page';
import Repertorios from '@/app/(site)/repertorios/page';
import Entrar from '@/app/entrar/page';
import Tocar from '@/app/tocar/page';
import '@/app/globals.css';
import { prenderLinks, useRota } from './rota';

const DO_SITE: Record<string, () => React.ReactNode> = {
  '/musicas': () => <Musicas />,
  '/musicas/editor': () => <EditorMusica />,
  '/musicas/importar': () => <ImportarMusicas />,
  '/repertorios': () => <Repertorios />,
  '/repertorios/editor': () => <EditorRepertorio />,
  '/grupos': () => <Grupos />,
  '/grupos/editor': () => <EditorGrupo />,
  '/conta': () => <Conta />,
};

function Telas() {
  const { pathname } = useRota();
  if (pathname === '/entrar') return <Entrar />;
  if (pathname === '/tocar') return <Tocar />;
  const tela = DO_SITE[pathname] ?? DO_SITE['/musicas'];
  return <LayoutSite><div key={pathname} style={{ display: 'contents' }}>{tela()}</div></LayoutSite>;
}

document.title = 'Palco Livre';
prenderLinks();
createRoot(document.getElementById('raiz')!).render(<DadosProvider><Telas /></DadosProvider>);
