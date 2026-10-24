// Artistas conhecidos para sugerir no campo Artista mesmo sem internet. Com internet, o campo também busca no MusicBrainz.
// Um por linha; para incluir mais, é só acrescentar uma linha.

const BRASIL = `
Os Paralamas do Sucesso
Legião Urbana
Titãs
Barão Vermelho
Capital Inicial
Ira!
Engenheiros do Hawaii
Kid Abelha
Paula Toller
Blitz
Ultraje a Rigor
RPM
Plebe Rude
Biquini Cavadão
Lulu Santos
Cazuza
Frejat
Rita Lee
Os Mutantes
Raul Seixas
Lobão
Marina Lima
Leo Jaime
Nenhum de Nós
Hanói-Hanói
Camisa de Vênus
Inimigos do Rei
Roupa Nova
14 Bis
Skank
Jota Quest
O Rappa
Charlie Brown Jr.
Raimundos
Los Hermanos
CPM 22
Detonautas Roque Clube
Pitty
NX Zero
Fresno
Nando Reis
Cássia Eller
Marisa Monte
Arnaldo Antunes
Tribalistas
Zeca Baleiro
Lenine
Chico Science & Nação Zumbi
Planet Hemp
Marcelo D2
Mamonas Assassinas
Sepultura
Angra
Shaman
Viper
Pato Fu
Tianastácia
Tihuana
Cachorro Grande
Vespas Mandarinas
Scalene
Supercombo
Malta
Rosa de Saron
Oficina G3
Catedral
Resgate
Fernandinho
Aline Barros
Diante do Trono
Anderson Freire
Gabriela Rocha
Thalles Roberto
Leonardo Gonçalves
Harpa Cristã
Caetano Veloso
Gilberto Gil
Chico Buarque
Milton Nascimento
Djavan
Tim Maia
Jorge Ben Jor
Elis Regina
Gal Costa
Maria Bethânia
Roberto Carlos
Erasmo Carlos
Tom Jobim
Vinicius de Moraes
João Gilberto
Ney Matogrosso
Secos & Molhados
Novos Baianos
Belchior
Fagner
Alceu Valença
Zé Ramalho
Geraldo Azevedo
Elba Ramalho
Luiz Gonzaga
Dominguinhos
Ivan Lins
João Bosco
Beto Guedes
Lô Borges
Flávio Venturini
Guilherme Arantes
Oswaldo Montenegro
Fábio Jr.
Ed Motta
Seu Jorge
Jorge Vercillo
Vanessa da Mata
Ana Carolina
Maria Gadú
Adriana Calcanhotto
Zélia Duncan
Simone
Emílio Santiago
Tiago Iorc
Anavitória
Melim
Vitor Kley
Silva
Lagum
Jão
Iza
Anitta
Ludmilla
Pabllo Vittar
Luísa Sonza
Sandy & Junior
Ivete Sangalo
Claudia Leitte
Daniela Mercury
Banda Eva
Chiclete com Banana
Asa de Águia
Olodum
Timbalada
Harmonia do Samba
É o Tchan
Léo Santana
Bell Marques
Psirico
Zeca Pagodinho
Martinho da Vila
Beth Carvalho
Alcione
Jorge Aragão
Arlindo Cruz
Fundo de Quintal
Cartola
Paulinho da Viola
Clara Nunes
Diogo Nogueira
Péricles
Thiaguinho
Exaltasamba
Grupo Revelação
Sorriso Maroto
Turma do Pagode
Belo
Raça Negra
Só Pra Contrariar
Alexandre Pires
Molejo
Art Popular
Negritude Junior
Katinguelê
Pixote
Dilsinho
Ferrugem
Menos É Mais
Mumuzinho
Benito di Paula
Luiz Melodia
Bezerra da Silva
Os Originais do Samba
Leci Brandão
Chitãozinho & Xororó
Zezé Di Camargo & Luciano
Leandro & Leonardo
Leonardo
Bruno & Marrone
João Paulo & Daniel
Daniel
Milionário & José Rico
Tonico & Tinoco
Gian & Giovani
Rionegro & Solimões
Victor & Leo
Jorge & Mateus
Henrique & Juliano
Marília Mendonça
Maiara & Maraisa
Simone & Simaria
Gusttavo Lima
Luan Santana
Wesley Safadão
Michel Teló
Gustavo Mioto
Zé Neto & Cristiano
Matheus & Kauan
Fernando & Sorocaba
César Menotti & Fabiano
Hugo & Guilherme
Cristiano Araújo
Israel & Rodolffo
Diego & Victor Hugo
Ana Castela
Almir Sater
Sérgio Reis
Renato Teixeira
Paula Fernandes
Eduardo Costa
Murilo Huff
Lauana Prado
Falamansa
Calcinha Preta
Mastruz com Leite
Aviões do Forró
Xand Avião
Limão com Mel
Flávio José
Dorgival Dantas
Tarcísio do Acordeon
João Gomes
Racionais MC's
Sabotage
Emicida
Criolo
Projota
Gabriel o Pensador
Filipe Ret
Matuê
Claudinho & Buchecha
Natiruts
Cidade Negra
Armandinho
Maneva
Tribo de Jah
Ponto de Equilíbrio
Chimarruts
Edson Gomes
`;

const MUNDO = `
The Beatles
The Rolling Stones
Queen
Led Zeppelin
Pink Floyd
Deep Purple
Black Sabbath
Ozzy Osbourne
Iron Maiden
Judas Priest
Metallica
Megadeth
Slayer
Pantera
AC/DC
Guns N' Roses
Bon Jovi
Aerosmith
Van Halen
Kiss
Def Leppard
Scorpions
Whitesnake
Europe
Journey
Toto
Boston
Foreigner
REO Speedwagon
Survivor
Styx
Kansas
The Outfield
a-ha
Duran Duran
Tears for Fears
Eurythmics
Depeche Mode
The Cure
The Smiths
Simple Minds
U2
The Police
Sting
Dire Straits
Eric Clapton
Jimi Hendrix
The Doors
The Who
Creedence Clearwater Revival
Eagles
Fleetwood Mac
Lynyrd Skynyrd
ZZ Top
Bruce Springsteen
Bob Dylan
Neil Young
Elton John
David Bowie
Billy Joel
Phil Collins
Genesis
Rush
Supertramp
Electric Light Orchestra
Bee Gees
ABBA
Michael Jackson
The Jackson 5
Prince
Madonna
Whitney Houston
Mariah Carey
Celine Dion
Cyndi Lauper
Kenny Loggins
Lionel Richie
Stevie Wonder
Marvin Gaye
Earth, Wind & Fire
Kool & the Gang
Donna Summer
Gloria Gaynor
Village People
Boney M.
Nirvana
Pearl Jam
Soundgarden
Alice in Chains
Foo Fighters
Red Hot Chili Peppers
Green Day
The Offspring
Blink-182
Linkin Park
Limp Bizkit
System of a Down
Rage Against the Machine
Korn
Slipknot
Evanescence
Muse
Radiohead
Coldplay
Oasis
Blur
The Killers
Arctic Monkeys
The Strokes
Kings of Leon
Franz Ferdinand
Imagine Dragons
OneRepublic
Maroon 5
Bruno Mars
Mark Ronson
Ed Sheeran
Adele
Amy Winehouse
Lady Gaga
Katy Perry
Taylor Swift
Beyoncé
Rihanna
Justin Timberlake
Dua Lipa
The Weeknd
Harry Styles
Billie Eilish
Shakira
Ricky Martin
Avril Lavigne
P!nk
Alanis Morissette
No Doubt
The Cranberries
Roxette
Bryan Adams
Joe Cocker
Rod Stewart
Tina Turner
Elvis Presley
Chuck Berry
Ray Charles
Frank Sinatra
B.B. King
Bob Marley
UB40
The Clash
Ramones
Sex Pistols
Motörhead
Dio
Rainbow
Helloween
Stratovarius
Nightwish
Avenged Sevenfold
Dream Theater
Extreme
Mr. Big
Skid Row
Poison
Mötley Crüe
Twisted Sister
Heart
Pat Benatar
Joan Jett & the Blackhearts
Blondie
INXS
Men at Work
Air Supply
Simply Red
Spandau Ballet
Culture Club
Wham!
George Michael
Pet Shop Boys
New Order
Information Society
Ace of Base
Backstreet Boys
Spice Girls
Britney Spears
Christina Aguilera
Black Eyed Peas
Daft Punk
Avicii
Train
Goo Goo Dolls
3 Doors Down
Nickelback
Creed
Hoobastank
Snow Patrol
Keane
The Fray
Paramore
Fall Out Boy
My Chemical Romance
Twenty One Pilots
Måneskin
The Black Keys
The White Stripes
Queens of the Stone Age
Audioslave
Marilyn Manson
Rammstein
Santana
Lenny Kravitz
Jamiroquai
Starship
Simon & Garfunkel
The Beach Boys
The Animals
Status Quo
Thin Lizzy
Bonnie Tyler
Meat Loaf
Johnny Cash
Shania Twain
Cat Stevens
Chicago
Barry White
Aretha Franklin
James Brown
Soda Stereo
Maná
Juanes
Alejandro Sanz
Laura Pausini
Eros Ramazzotti
Andrea Bocelli
`;

const lista = (texto: string) => texto.split('\n').map(l => l.trim()).filter(Boolean);

export const ARTISTAS: string[] = [...new Set([...lista(BRASIL), ...lista(MUNDO)])];
