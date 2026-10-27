import type { GuideMap } from './types';

const WRIST_CURL_MISTAKES = [
  'Tirar o antebraço do apoio e transformar o movimento em rosca de bíceps.',
  'Usar carga demais e encurtar a amplitude do punho.',
];

const EXTENSION_MISTAKES = [
  'Usar carga pesada: os extensores são menores que os flexores.',
  'Dobrar os cotovelos para ajudar a subir.',
];

export const FOREARM_GUIDES: GuideMap = {
  '1131': {
    muscles: 'Flexores do punho (parte interna do antebraço).',
    setup: [
      'Sente-se na ponta do banco e apoie os antebraços nas coxas ou no banco.',
      'Segure a barra com as palmas para cima, punhos para fora do apoio.',
    ],
    steps: [
      'Deixe o punho descer devagar, abrindo um pouco os dedos.',
      'Feche a mão e flexione o punho, levando a barra o mais alto possível.',
      'Segure um instante no topo e desça controlando.',
    ],
    breathing: 'Solte o ar ao subir a barra e inspire na descida.',
    tips: [
      'Repetições altas (12–20) funcionam muito bem para antebraço.',
      'Só o punho se mexe: o antebraço fica colado no apoio.',
    ],
    mistakes: WRIST_CURL_MISTAKES,
  },
  '1132': {
    muscles: 'Extensores do punho (parte de cima do antebraço).',
    setup: [
      'Apoie os antebraços no banco ou nas coxas, palmas para baixo.',
      'Deixe só as mãos para fora do apoio, segurando a barra.',
    ],
    steps: [
      'Deixe o punho cair devagar até sentir o alongamento.',
      'Estenda o punho, levantando o dorso das mãos o máximo possível.',
      'Desça controlando, sem soltar a pegada.',
    ],
    breathing: 'Solte o ar na subida e inspire ao descer.',
    tips: [
      'Comece bem mais leve que na rosca de punho normal.',
      'Ajuda a equilibrar o antebraço e prevenir dores no cotovelo.',
    ],
    mistakes: EXTENSION_MISTAKES,
  },
  '1133': {
    muscles: 'Flexores do punho, um lado de cada vez ou os dois juntos.',
    setup: [
      'Sentado, apoie os antebraços nas coxas com as palmas para cima.',
      'Segure um halter em cada mão, punhos para fora dos joelhos.',
    ],
    steps: [
      'Deixe os halteres descerem, dobrando o punho para baixo.',
      'Flexione o punho levantando os halteres em direção ao corpo.',
      'Desça devagar e repita.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Com halteres, cada lado trabalha sozinho e o mais fraco não se esconde.',
      'Use a amplitude toda: do punho bem dobrado para baixo até o topo.',
    ],
    mistakes: WRIST_CURL_MISTAKES,
  },
  '1134': {
    muscles: 'Extensores do punho (dorso do antebraço).',
    setup: [
      'Sentado, apoie os antebraços nas coxas com as palmas para baixo.',
      'Halteres leves, punhos para fora dos joelhos.',
    ],
    steps: [
      'Deixe os halteres descerem dobrando o punho para baixo.',
      'Levante o dorso das mãos estendendo o punho.',
      'Desça controlando a carga.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Halteres leves e repetições altas rendem mais aqui.',
      'Pare se sentir dor no cotovelo; reduza a carga.',
    ],
    mistakes: EXTENSION_MISTAKES,
  },
  '1135': {
    muscles: 'Flexores do punho, com os dedos.',
    setup: [
      'Em pé, segure a barra atrás do corpo, palmas para trás, mãos na largura dos ombros.',
      'Braços estendidos e soltos ao lado do corpo.',
    ],
    steps: [
      'Deixe a barra rolar até a ponta dos dedos, abrindo as mãos.',
      'Feche as mãos e flexione os punhos, subindo a barra.',
      'Desça devagar e repita.',
    ],
    breathing: 'Respire normalmente; solte o ar ao fechar as mãos.',
    tips: [
      'Aguenta mais carga que a versão sentada: bom para a pegada.',
      'Mantenha os ombros parados; só punhos e dedos trabalham.',
    ],
    mistakes: [
      'Encolher os ombros ou dobrar os cotovelos para ajudar.',
      'Deixar a barra bater nas pernas a cada repetição.',
    ],
  },
  '1136': {
    muscles: 'Flexores do punho, com tensão constante do cabo.',
    setup: [
      'Polia na posição baixa com barra reta ou corda.',
      'Ajoelhe ou sente-se de frente para a polia, antebraços apoiados, palmas para cima.',
    ],
    steps: [
      'Deixe o cabo puxar o punho para baixo, alongando.',
      'Flexione o punho trazendo a barra para cima.',
      'Volte devagar, sem deixar o peso bater.',
    ],
    breathing: 'Solte o ar ao flexionar e inspire ao voltar.',
    tips: [
      'O cabo mantém tensão o tempo todo, inclusive no alongamento.',
      'Dá para fazer com as palmas para baixo e trabalhar os extensores.',
    ],
    mistakes: WRIST_CURL_MISTAKES,
  },
  '1137': {
    muscles: 'Flexores e extensores do antebraço, com ombros estabilizando.',
    setup: [
      'Prenda uma anilha leve na corda do rolo.',
      'Em pé, segure o rolo com os braços estendidos à frente, na altura dos ombros.',
    ],
    steps: [
      'Gire os punhos, uma mão de cada vez, enrolando a corda até a anilha subir.',
      'No topo, desenrole devagar até a anilha descer.',
      'Para trabalhar o outro lado, enrole girando no sentido contrário.',
    ],
    breathing: 'Respire de forma contínua; não prenda o ar.',
    tips: [
      'Com os braços mais baixos fica mais fácil; suba com o tempo.',
      'A descida controlada é metade do exercício.',
    ],
    mistakes: [
      'Deixar os braços caírem durante a série.',
      'Soltar a anilha de uma vez em vez de desenrolar devagar.',
    ],
  },
  '1138': {
    muscles: 'Pegada e antebraços, com trapézio e core.',
    setup: [
      'Pegue um halter (ou kettlebell) pesado em cada mão.',
      'Fique ereto, ombros para trás, abdômen firme.',
    ],
    steps: [
      'Caminhe com passos curtos e firmes, olhando para a frente.',
      'Mantenha os halteres parados ao lado do corpo.',
      'Ande a distância ou o tempo combinado e apoie com cuidado.',
    ],
    breathing: 'Respire curto e constante, sem soltar o abdômen.',
    tips: [
      'Registre a carga e as repetições como "voltas" ou metros.',
      'Ótimo no fim do treino para pegada e postura.',
    ],
    mistakes: [
      'Inclinar o tronco ou deixar os ombros caírem para a frente.',
      'Andar rápido demais e perder o controle dos halteres.',
    ],
  },
  '1139': {
    muscles: 'Músculos dos dedos e da pegada, com flexores do antebraço.',
    setup: [
      'Junte duas anilhas lisas, lado liso para fora.',
      'Segure as duas pela borda de cima usando só os dedos e o polegar.',
    ],
    steps: [
      'Levante as anilhas do chão com as costas retas.',
      'Segure firme pelo tempo combinado (ex.: 20–30 segundos).',
      'Apoie de volta no chão com controle.',
    ],
    breathing: 'Respire normalmente durante a pegada.',
    tips: [
      'Comece com anilhas leves: a pinça cansa rápido.',
      'Anote o tempo ou o peso para acompanhar a evolução.',
    ],
    mistakes: [
      'Apoiar as anilhas na palma da mão em vez de usar os dedos.',
      'Curvar as costas para pegar as anilhas no chão.',
    ],
  },
  '1140': {
    muscles: 'Flexores dos dedos e do antebraço.',
    setup: [
      'Sente-se com os antebraços apoiados nas coxas, palmas para cima.',
      'Segure a barra com as mãos na largura dos ombros.',
    ],
    steps: [
      'Abra as mãos e deixe a barra rolar até a ponta dos dedos.',
      'Feche os dedos trazendo a barra de volta à palma.',
      'Termine flexionando um pouco o punho e repita.',
    ],
    breathing: 'Solte o ar ao fechar as mãos.',
    tips: [
      'Excelente para quem perde a pegada na barra fixa e no terra.',
      'Movimento curto e controlado; nada de soltar a barra.',
    ],
    mistakes: [
      'Deixar a barra cair dos dedos por usar carga demais.',
      'Levantar os antebraços do apoio.',
    ],
  },
};
