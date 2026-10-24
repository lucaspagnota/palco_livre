// Conteúdo do modo demonstração (sem banco configurado). Letras escritas para o exemplo.
import type { Grupo, Musica, Perfil, Repertorio } from './modelo';

export const DEMO_EU: Perfil = { id: 'u-voce', nome: 'Você', nick: 'voce', email: 'voce@palcolivre.app', uf: 'SP' };
export const DEMO_OUTROS: Perfil[] = [
  { id: 'u-rafa', nome: 'Rafa Batera', nick: 'rafabatera', email: 'rafa@palcolivre.app', uf: 'SP' },
  { id: 'u-bia', nome: 'Bia Baixo', nick: 'biabaixo', email: 'bia@palcolivre.app', uf: 'MG' },
];

const quando = '2026-10-20T12:00:00.000Z';

const m = (id: string, titulo: string, artista: string, estilo: string, tom: string, letra: string, capo: number | null = null, donoId = DEMO_EU.id): Musica => ({
  id, donoId, titulo, artista, estilo, tom, capo, letra, publica: true, copias: 0, atualizadoEm: quando,
});

export const DEMO_MUSICAS: Musica[] = [
  m('m-estrada', 'Estrada de Terra', 'Banda Exemplo', 'Sertanejo', 'G', `[Intro] G  D/F#  Em  C
        G  D/F#  Em  C

[Primeira Parte]

G               D/F#
Pela estrada de terra eu vou
Em          C          G
Levando a viola e o cansar
G                D/F#
Cada curva um lugar que ficou
Em               C          D
Cada poeira um jeito de voltar

{refrão}
[Refrão]

C               G
Ô, estrada, me leva
D                Em
Que a saudade é grande demais
C               G
Ô, estrada, me entrega
D                         G
Pros braços de quem ficou lá atrás
{/refrão}
{2ª voz}
C          G
Lá atrás, lá atrás
{/2ª voz}

[Segunda Parte]

G                 D/F#
O sol se deita no meu chapéu
Em                C        G
A lua acende o meu caminhar
G                  D/F#
Escrevo seu nome no pó do céu
Em                 C          D
Pra ver se o vento sabe te achar

[Refrão]

[Solo]
e|-----3-----2-----0-----|
B|---3---3-3---3-1---1---|
G|-0-----------------0---|

// Final: repetir o refrão e terminar em G

( C  D  G )`, 2),
  m('m-luz', 'Luz do Palco', 'Marina Prado', 'Pop', 'D', `[Intro] D  A  Bm  G

[Primeira Parte]

D                    A
Acende a luz que eu já cheguei
Bm                   G
Trouxe a vontade e o que sei
D                 A
Cada acorde é uma porta aberta
Bm              G           A
Pra quem chegou na hora certa

{refrão}
[Refrão]

G         A          D
Luz do palco, me ilumina
G           A          Bm
Que essa noite é toda minha
G         A          D    Bm
Luz do palco, não termina
G            A        D
Enquanto houver melodia
{/refrão}`),
  m('m-mare', 'Maré Baixa', 'Os Ventania', 'MPB', 'Am', `[Intro] Am  Dm  E7

Am                 Dm
A maré desceu devagar
G                   C
Deixou conchas pelo chão
Am                Dm
E eu fiquei a esperar
E7
Outra onda, outro verão

{refrão}
F           G
Vem, maré, me buscar
Em          Am
Leva o que restou
F           G         Am
Que o mar sabe guardar
Dm     E7     Am
O que o tempo levou
{/refrão}`),
  m('m-domingo', 'Domingo Cedo', 'Trio Serrano', 'Pagode', 'E', `[Intro] E  C#m  A  B7

E                C#m
Domingo cedo, café na mesa
A                 B7
O sol entrando pela janela
E                  C#m
Roda de samba, pura beleza
A              B7         E
Tem cavaquinho, tem tagarela

{refrão}
A         B7        G#m   C#m
Ê, domingo, não vai embora
F#m       B7          E
Fica mais um pouco agora
{/refrão}`),
  m('m-vento', 'Vento Sul', 'Banda Exemplo', 'Rock', 'C', `[Intro] C  G/B  Am  F

C            G/B
Vento sul soprou na serra
Am           Em
Trouxe o frio e a canção
F            C
Toda a gente desta terra
Dm      G         C
Canta junto o refrão`),
  m('m-ceu', 'Céu de Agosto', 'Bia Baixo', 'Rock', 'Em', `[Intro] Em  C  G  D

Em            C
Céu de agosto, vento frio
G              D
Rua cheia, coração vazio
Em            C
Toco alto pra esquecer
G             D
Que amanhã eu vou te ver`, null, 'u-bia'),
];

export const DEMO_REPERTORIOS: Repertorio[] = [
  {
    id: 'r-sabado', donoId: DEMO_EU.id, titulo: 'Show Sábado', estilo: 'Rock', numerar: true, publica: false, copias: 0, atualizadoEm: quando,
    itens: [
      { musicaId: null, momento: 'Bloco 1' },
      { musicaId: 'm-luz', momento: null },
      { musicaId: 'm-domingo', momento: null },
      { musicaId: null, momento: null, pausa: 'ÁGUA' },
      { musicaId: 'm-estrada', momento: null },
      { musicaId: null, momento: 'Bloco 2 (Rock Nacional)' },
      { musicaId: 'm-mare', momento: null },
      { musicaId: 'm-vento', momento: null },
    ],
  },
  {
    id: 'r-acustico', donoId: DEMO_EU.id, titulo: 'Acústico', estilo: 'MPB', numerar: true, publica: false, copias: 0, atualizadoEm: quando,
    itens: [{ musicaId: 'm-mare', momento: null }, { musicaId: 'm-estrada', momento: null }],
  },
  {
    id: 'r-ensaio-bia', donoId: 'u-bia', titulo: 'Ensaio da Bia', estilo: 'Rock', numerar: true, publica: false, copias: 0, atualizadoEm: quando,
    itens: [{ musicaId: 'm-ceu', momento: null }],
  },
];

export const DEMO_GRUPOS: Grupo[] = [
  {
    id: 'g-banda', donoId: DEMO_EU.id, titulo: 'BANDA EXEMPLO', atualizadoEm: quando,
    membros: ['u-rafa', 'u-bia'],
    repertorios: [
      { repertorioId: 'r-sabado', adicionadoPor: DEMO_EU.id },
      { repertorioId: 'r-ensaio-bia', adicionadoPor: 'u-bia' },
    ],
  },
];
