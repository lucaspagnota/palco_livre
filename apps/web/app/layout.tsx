import type { Metadata, Viewport } from 'next';
import { Roboto, Roboto_Mono, Rubik } from 'next/font/google';
import { SCRIPT_TEMA } from '@/components/BotaoTema';
import { DadosProvider } from '@/lib/dados';
import './globals.css';

const ui = Roboto({ subsets: ['latin'], weight: ['400', '500', '700', '900'], variable: '--font-ui' });
const mono = Roboto_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });
const logo = Rubik({ subsets: ['latin'], weight: ['800'], variable: '--font-logo' });

export const metadata: Metadata = {
  title: { default: 'Palco Livre', template: 'Palco Livre | %s' },
  description: 'Cifras, repertórios e grupos para a sua banda.',
};

export const viewport: Viewport = { themeColor: '#0b1d33' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${mono.variable} ${logo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <DadosProvider>{children}</DadosProvider>
      </body>
    </html>
  );
}
