import type { GuideMap } from './types';

const EXTEND_BREATHING = 'Solte o ar ao estender os braços e inspire na volta.';

export const TRICEPS_GUIDES: GuideMap = {
  '1115': {
    muscles: 'Tríceps.',
    setup: [
      'Encaixe a barra reta (ou V) na polia alta.',
      'Cotovelos colados ao tronco, antebraços paralelos ao chão.',
    ],
    steps: [
      'Empurre a barra para baixo até estender os braços.',
      'Contraia o tríceps no final.',
      'Volte devagar até os antebraços ficarem paralelos ao chão.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Os cotovelos são uma dobradiça: não se movem.',
      'Incline levemente o tronco à frente.',
    ],
    mistakes: [
      'Usar o peso do corpo para empurrar.',
      'Deixar os cotovelos subirem na volta.',
    ],
  },
  '1116': {
    muscles: 'Tríceps (ênfase na porção lateral).',
    setup: [
      'Encaixe a corda na polia alta e segure as pontas.',
      'Cotovelos junto ao corpo.',
    ],
    steps: [
      'Empurre a corda para baixo até estender os braços.',
      'No final, afaste as pontas da corda para os lados.',
      'Volte devagar.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Abrir a corda no final aumenta a contração.',
      'Use carga menor que na barra.',
    ],
    mistakes: ['Abrir os cotovelos.', 'Curvar o tronco sobre a corda.'],
  },
  '1117': {
    muscles: 'Tríceps (ênfase na porção longa).',
    setup: [
      'Encaixe a corda na polia (baixa ou alta) e fique de costas para ela.',
      'Corda atrás da cabeça, cotovelos apontando para a frente.',
    ],
    steps: [
      'Estenda os braços para a frente e para cima.',
      'Contraia o tríceps com os braços estendidos.',
      'Volte devagar até alongar bem atrás da cabeça.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Com o braço acima da cabeça, a porção longa trabalha alongada.',
      'Dê um passo à frente para equilibrar.',
    ],
    mistakes: ['Abrir os cotovelos para os lados.', 'Arquear a lombar.'],
  },
  '1118': {
    muscles: 'Tríceps.',
    setup: [
      'Deite-se no banco segurando a barra acima do peito, pegada na largura dos ombros.',
      'Braços estendidos.',
    ],
    steps: [
      'Dobre os cotovelos descendo a barra em direção à testa.',
      'Mantenha os braços parados.',
      'Estenda os braços de volta.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'Leve a barra um pouco atrás da cabeça para alongar mais.',
      'Peça ajuda em cargas altas.',
    ],
    mistakes: ['Abrir os cotovelos.', 'Mover os braços (vira pullover).'],
  },
  '1119': {
    muscles: 'Tríceps.',
    setup: [
      'Deite-se com a barra W acima do peito, pegada nas curvas internas.',
      'Braços estendidos.',
    ],
    steps: [
      'Desça a barra em direção à testa dobrando só os cotovelos.',
      'Pare logo acima da testa.',
      'Estenda os braços.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'A barra W é mais confortável para os punhos.',
      'Controle a descida.',
    ],
    mistakes: ['Cotovelos abertos.', 'Descer rápido demais.'],
  },
  '1120': {
    muscles: 'Tríceps, com peitoral e ombros.',
    setup: [
      'Deite-se como no supino e segure a barra na largura dos ombros.',
      'Escápulas apertadas.',
    ],
    steps: [
      'Desça a barra até a parte de baixo do peito, cotovelos junto ao corpo.',
      'Empurre até estender os braços.',
      'Mantenha os punhos retos.',
    ],
    breathing: 'Inspire na descida e solte o ar ao empurrar.',
    tips: [
      'Não feche demais a pegada: largura dos ombros é suficiente.',
      'Permite cargas altas para o tríceps.',
    ],
    mistakes: ['Mãos muito juntas (força os punhos).', 'Abrir os cotovelos.'],
  },
  '1121': {
    muscles: 'Tríceps, com ombros.',
    setup: [
      'Apoie as mãos na borda de um banco atrás de você.',
      'Pernas estendidas à frente (ou dobradas, para facilitar).',
    ],
    steps: [
      'Desça o corpo dobrando os cotovelos até cerca de 90°.',
      'Mantenha as costas perto do banco.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Apoie os pés em outro banco ou coloque uma anilha no colo para dificultar.',
      'Não desça além de 90° se os ombros incomodarem.',
    ],
    mistakes: ['Afastar o corpo do banco.', 'Descer demais.'],
  },
  '1122': {
    muscles: 'Tríceps, com peitoral e ombros.',
    setup: [
      'Apoie-se nas paralelas com os braços estendidos.',
      'Tronco vertical, cotovelos junto ao corpo.',
    ],
    steps: [
      'Desça dobrando os cotovelos até cerca de 90°.',
      'Mantenha o tronco reto.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Tronco reto = mais tríceps; inclinado = mais peito.',
      'Use a máquina assistida se precisar.',
    ],
    mistakes: ['Abrir os cotovelos.', 'Balançar as pernas.'],
  },
  '1123': {
    muscles: 'Tríceps.',
    setup: [
      'Apoie uma mão e um joelho no banco, tronco paralelo ao chão.',
      'Braço com o halter colado ao corpo, cotovelo dobrado a 90°.',
    ],
    steps: [
      'Estenda o cotovelo levando o halter para trás.',
      'Segure a contração com o braço estendido.',
      'Volte devagar até 90°.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'O braço fica parado e paralelo ao chão.',
      'Cargas leves: o foco é a contração.',
    ],
    mistakes: ['Balançar o halter.', 'Deixar o cotovelo cair.'],
  },
  '1124': {
    muscles: 'Tríceps (porção longa).',
    setup: [
      'Sente-se ou fique em pé com um halter acima da cabeça, braço estendido.',
      'Cotovelo apontando para cima.',
    ],
    steps: [
      'Desça o halter atrás da cabeça dobrando o cotovelo.',
      'Mantenha o braço parado, próximo à cabeça.',
      'Estenda o braço de volta.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'Segure o cotovelo com a outra mão para estabilizar.',
      'Faça todas as repetições de um lado antes de trocar.',
    ],
    mistakes: ['Abrir o cotovelo para o lado.', 'Arquear a lombar.'],
  },
  '1125': {
    muscles: 'Tríceps, um lado por vez.',
    setup: [
      'Encaixe um pegador de mão na polia alta.',
      'Cotovelo junto ao corpo.',
    ],
    steps: [
      'Estenda o braço para baixo até ficar reto.',
      'Contraia o tríceps no final.',
      'Volte devagar.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Ajuda a corrigir diferenças entre os braços.',
      'Teste a pegada supinada para variar.',
    ],
    mistakes: ['Mover o cotovelo.', 'Girar o tronco.'],
  },
  '1126': {
    muscles: 'Tríceps (porção longa).',
    setup: [
      'Segure um halter com as duas mãos acima da cabeça.',
      'Sentado com encosto ou em pé, abdômen firme.',
    ],
    steps: [
      'Desça o halter atrás da cabeça dobrando os cotovelos.',
      'Mantenha os cotovelos apontando para cima.',
      'Estenda os braços de volta.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'Segure o halter pela parte de cima, com as mãos em forma de losango.',
      'Desça até alongar bem.',
    ],
    mistakes: ['Abrir os cotovelos.', 'Arquear as costas.'],
  },
  '1127': {
    muscles: 'Tríceps.',
    setup: [
      'Deite-se com a barra EZ acima do peito, braços estendidos.',
      'Pegada nas curvas internas.',
    ],
    steps: [
      'Dobre os cotovelos levando a barra para trás da cabeça.',
      'Mantenha os braços parados.',
      'Estenda de volta.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'Inclinar levemente os braços para trás mantém tensão no topo.',
      'Controle a descida.',
    ],
    mistakes: ['Cotovelos abrindo.', 'Usar impulso.'],
  },
  '1128': {
    muscles: 'Tríceps (ênfase na porção medial).',
    setup: [
      'Segure a barra da polia alta com as palmas para cima.',
      'Cotovelos junto ao corpo.',
    ],
    steps: [
      'Empurre a barra para baixo até estender os braços.',
      'Contraia no final.',
      'Volte devagar.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Use menos carga que na pegada pronada.',
      'Mantenha os punhos retos.',
    ],
    mistakes: ['Dobrar os punhos.', 'Mover os cotovelos.'],
  },
  '1129': {
    muscles: 'Tríceps, com core.',
    setup: [
      'Apoie as mãos em uma barra (no smith ou no rack) na altura da cintura.',
      'Corpo reto, inclinado como em uma flexão.',
    ],
    steps: [
      'Dobre os cotovelos levando a testa em direção à barra.',
      'Mantenha o corpo alinhado.',
      'Estenda os braços para voltar.',
    ],
    breathing: 'Inspire ao descer e solte o ar ao estender.',
    tips: [
      'Quanto mais baixa a barra, mais difícil.',
      'Ótimo para treinar sem equipamento pesado.',
    ],
    mistakes: ['Deixar o quadril cair.', 'Abrir os cotovelos.'],
  },
  '1130': {
    muscles: 'Tríceps, isolado.',
    setup: [
      'Ajuste o assento para o cotovelo ficar alinhado ao eixo da máquina.',
      'Braços apoiados.',
    ],
    steps: [
      'Estenda os braços empurrando os pegadores.',
      'Contraia o tríceps no final.',
      'Volte devagar.',
    ],
    breathing: EXTEND_BREATHING,
    tips: [
      'Seguro para treinar até a falha.',
      'Mantenha as costas no encosto.',
    ],
    mistakes: ['Usar o tronco para empurrar.', 'Deixar a carga bater.'],
  },
};
