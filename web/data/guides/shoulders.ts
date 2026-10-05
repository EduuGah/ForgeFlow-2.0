import type { GuideMap } from './types';

const PRESS_BREATHING = 'Solte o ar ao empurrar e inspire na descida.';
const RAISE_BREATHING = 'Solte o ar ao subir e inspire ao descer.';

export const SHOULDER_GUIDES: GuideMap = {
  '1098': {
    muscles: 'Ombros (parte da frente e lateral), com tríceps e core.',
    setup: [
      'Segure a barra na frente dos ombros, mãos um pouco além da largura deles.',
      'Pés na largura do quadril, glúteos e abdômen contraídos.',
    ],
    steps: [
      'Empurre a barra para cima, afastando levemente a cabeça para trás.',
      'Quando a barra passar a testa, traga a cabeça de volta para baixo dela.',
      'Estenda os braços no alto e desça controlando até os ombros.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Em pé, o core trabalha muito: não arqueie a lombar.',
      'Antebraços verticais no início do movimento.',
    ],
    mistakes: [
      'Inclinar o tronco para trás.',
      'Usar impulso das pernas (vira push press).',
    ],
  },
  '1099': {
    muscles: 'Ombros, com tríceps e core.',
    setup: [
      'Segure os halteres na altura dos ombros, palmas para a frente.',
      'Em pé, abdômen firme.',
    ],
    steps: [
      'Empurre os halteres para cima até estender os braços.',
      'Aproxime-os no topo sem encostar.',
      'Desça devagar até a altura das orelhas.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Halteres permitem um caminho mais natural para os ombros.',
      'Pode alternar os braços.',
    ],
    mistakes: ['Arquear a lombar.', 'Descer pouco.'],
  },
  '1100': {
    muscles: 'Ombros (as três porções), com tríceps.',
    setup: [
      'Sente-se com os halteres à frente dos ombros, palmas voltadas para você.',
      'Costas apoiadas.',
    ],
    steps: [
      'Empurre os halteres para cima girando as palmas para a frente.',
      'Estenda os braços no topo.',
      'Desça fazendo a rotação de volta.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'A rotação é contínua durante a subida.',
      'Use carga menor que no desenvolvimento comum.',
    ],
    mistakes: ['Girar só no final.', 'Bater os halteres no topo.'],
  },
  '1101': {
    muscles: 'Ombros (porção lateral).',
    setup: [
      'Segure os halteres ao lado do corpo, cotovelos levemente dobrados.',
      'Tronco levemente inclinado à frente.',
    ],
    steps: [
      'Eleve os braços para os lados até a altura dos ombros.',
      'Lidere o movimento com os cotovelos, não com as mãos.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'Cargas leves e muitas repetições funcionam bem.',
      'Imagine "empurrar as paredes" para os lados.',
    ],
    mistakes: ['Encolher os ombros (o trapézio assume).', 'Balançar o corpo.'],
  },
  '1102': {
    muscles: 'Ombros (porção lateral), com tensão constante.',
    setup: [
      'Ajuste a polia baixa e fique de lado para ela.',
      'Segure o pegador com a mão mais distante, cabo passando à frente do corpo.',
    ],
    steps: [
      'Eleve o braço para o lado até a altura do ombro.',
      'Segure um instante.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'O cabo mantém tensão desde o início do movimento.',
      'Apoie a outra mão no aparelho para estabilizar.',
    ],
    mistakes: [
      'Inclinar o corpo para longe da polia.',
      'Subir acima dos ombros.',
    ],
  },
  '1103': {
    muscles: 'Ombros (porção frontal).',
    setup: [
      'Segure os halteres à frente das coxas, palmas para trás.',
      'Cotovelos levemente dobrados.',
    ],
    steps: [
      'Eleve um ou os dois halteres à frente até a altura dos ombros.',
      'Segure um instante.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'A porção frontal já trabalha no supino: use volume moderado.',
      'Alternar os braços ajuda a manter a postura.',
    ],
    mistakes: ['Usar impulso do tronco.', 'Subir acima da cabeça.'],
  },
  '1104': {
    muscles: 'Parte posterior do ombro, com romboides.',
    setup: [
      'Incline o tronco à frente (ou deite de bruços em um banco inclinado).',
      'Halteres pendurados abaixo dos ombros, cotovelos levemente dobrados.',
    ],
    steps: [
      'Abra os braços para os lados até a linha dos ombros.',
      'Aperte a parte de trás dos ombros no topo.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'Use cargas leves: o músculo é pequeno.',
      'Pense em levar as mãos para longe, não para cima.',
    ],
    mistakes: [
      'Apertar as escápulas (vira exercício de costas).',
      'Balançar o tronco.',
    ],
  },
  '1105': {
    muscles: 'Parte posterior do ombro, trapézio médio e rotadores externos.',
    setup: [
      'Ajuste a corda na polia na altura do rosto.',
      'Segure as pontas com as palmas para baixo e dê um passo para trás.',
    ],
    steps: [
      'Puxe a corda em direção ao rosto, abrindo as mãos para os lados.',
      'No final, gire os braços para trás (posição de "duplo bíceps").',
      'Volte devagar.',
    ],
    breathing: 'Solte o ar ao puxar e inspire na volta.',
    tips: [
      'Excelente para a saúde dos ombros: inclua no aquecimento ou no final do treino.',
      'Cotovelos na altura dos ombros ou acima.',
    ],
    mistakes: ['Puxar com o tronco.', 'Cotovelos baixos (vira remada).'],
  },
  '1106': {
    muscles: 'Ombros (porção lateral) e trapézio.',
    setup: [
      'Segure a barra à frente das coxas com pegada um pouco mais larga que os ombros.',
      'Em pé, tronco firme.',
    ],
    steps: [
      'Puxe a barra para cima rente ao corpo, cotovelos liderando.',
      'Suba até os cotovelos ficarem na altura dos ombros.',
      'Desça devagar.',
    ],
    breathing: 'Solte o ar ao subir e inspire ao descer.',
    tips: [
      'A pegada mais aberta é mais confortável para os ombros.',
      'Não passe da linha dos ombros.',
    ],
    mistakes: [
      'Pegada muito fechada (comprime o ombro).',
      'Subir os cotovelos acima dos ombros.',
    ],
  },
  '1107': {
    muscles: 'Trapézio superior.',
    setup: [
      'Segure um halter em cada mão ao lado do corpo.',
      'Braços estendidos.',
    ],
    steps: [
      'Eleve os ombros em direção às orelhas.',
      'Segure no topo.',
      'Desça devagar.',
    ],
    breathing: 'Solte o ar ao subir e inspire ao descer.',
    tips: ['Movimento vertical, sem rotação.', 'Mantenha o pescoço neutro.'],
    mistakes: ['Dobrar os cotovelos.', 'Girar os ombros.'],
  },
  '1108': {
    muscles: 'Ombros, com tríceps.',
    setup: [
      'Sente-se em um banco com encosto vertical sob a barra (no rack ou no smith).',
      'Pegada um pouco além dos ombros.',
    ],
    steps: [
      'Desça a barra à frente do rosto até a altura do queixo.',
      'Empurre até estender os braços.',
      'Mantenha as costas no encosto.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Sentado, o tronco fica estável: dá para focar nos ombros.',
      'Não leve a barra atrás da nuca.',
    ],
    mistakes: ['Arquear a lombar para fora do encosto.', 'Descer pouco.'],
  },
  '1109': {
    muscles: 'Ombros, com tríceps.',
    setup: [
      'Sente-se com o encosto quase vertical.',
      'Halteres na altura dos ombros, palmas para a frente.',
    ],
    steps: [
      'Empurre os halteres para cima até estender os braços.',
      'Aproxime-os no topo.',
      'Desça devagar até a altura das orelhas.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Leve os halteres com um impulso dos joelhos até os ombros antes de começar.',
      'Cotovelos levemente à frente do corpo.',
    ],
    mistakes: [
      'Encostar os halteres no topo e descansar.',
      'Arquear as costas.',
    ],
  },
  '1110': {
    muscles: 'Ombros, com tríceps.',
    setup: [
      'Ajuste o assento para os pegadores ficarem na altura dos ombros.',
      'Costas apoiadas.',
    ],
    steps: [
      'Empurre os pegadores para cima.',
      'Estenda os braços sem travar os cotovelos.',
      'Volte devagar.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Seguro para treinar perto da falha.',
      'Pegada neutra, se houver, poupa os ombros.',
    ],
    mistakes: ['Tirar as costas do encosto.', 'Deixar a carga bater.'],
  },
  '1111': {
    muscles: 'Ombros (porção frontal).',
    setup: [
      'Fique de costas para a polia baixa, cabo entre as pernas.',
      'Segure o pegador à frente das coxas.',
    ],
    steps: [
      'Eleve o braço à frente até a altura do ombro.',
      'Segure um instante.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'O cabo mantém tensão no início do movimento.',
      'Pode fazer com uma corda e as duas mãos.',
    ],
    mistakes: ['Inclinar o tronco para trás.', 'Subir acima dos ombros.'],
  },
  '1112': {
    muscles: 'Ombros (porção frontal), com core.',
    setup: [
      'Segure uma anilha pelas laterais, à frente das coxas.',
      'Braços quase estendidos.',
    ],
    steps: [
      'Eleve a anilha à frente até a altura dos olhos.',
      'Segure um instante.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'A pegada na anilha também trabalha o antebraço.',
      'Mantenha o abdômen firme.',
    ],
    mistakes: ['Arquear a lombar.', 'Usar impulso.'],
  },
  '1113': {
    muscles: 'Parte posterior do ombro, com romboides.',
    setup: [
      'Sente-se de frente para o encosto do peck deck, peito apoiado.',
      'Segure os pegadores com os braços estendidos à frente.',
    ],
    steps: [
      'Abra os braços para trás em arco até a linha dos ombros.',
      'Segure um instante.',
      'Volte devagar.',
    ],
    breathing: 'Solte o ar ao abrir e inspire ao fechar.',
    tips: [
      'Cotovelos levemente dobrados e fixos.',
      'Use cargas leves e boa amplitude.',
    ],
    mistakes: ['Apertar as escápulas demais.', 'Usar impulso.'],
  },
  '1114': {
    muscles: 'Ombros (porção frontal), com core.',
    setup: [
      'Segure a barra à frente das coxas, pegada na largura dos ombros.',
      'Braços quase estendidos.',
    ],
    steps: [
      'Eleve a barra à frente até a altura dos ombros.',
      'Segure um instante.',
      'Desça devagar.',
    ],
    breathing: RAISE_BREATHING,
    tips: [
      'Use carga moderada para manter o tronco parado.',
      'Barra W é mais confortável para os punhos.',
    ],
    mistakes: ['Inclinar o corpo para trás.', 'Subir com impulso.'],
  },
};
