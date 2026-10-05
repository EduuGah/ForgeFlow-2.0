import type { GuideMap } from './types';

const CURL_MISTAKES = [
  'Balançar o tronco para levantar a carga.',
  'Levar os cotovelos para a frente no final da subida.',
];

export const BICEPS_GUIDES: GuideMap = {
  '1021': {
    muscles: 'Bíceps, com braquial e antebraços.',
    setup: [
      'Segure a barra com as palmas para a frente, mãos na largura dos ombros.',
      'Fique em pé, braços estendidos, cotovelos colados ao tronco.',
    ],
    steps: [
      'Dobre os cotovelos levando a barra em direção aos ombros.',
      'Contraia o bíceps no topo, sem tirar os cotovelos do lugar.',
      'Desça devagar até estender os braços por completo.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Uma descida de 2–3 segundos rende mais que carga extra.',
      'Se os punhos incomodarem, use a barra W.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1022': {
    muscles: 'Bíceps e braquial, com antebraços.',
    setup: [
      'Segure a barra W nas curvas internas ou externas, palmas levemente inclinadas.',
      'Fique em pé com os cotovelos junto ao corpo.',
    ],
    steps: [
      'Suba a barra dobrando apenas os cotovelos.',
      'Aperte o bíceps no topo.',
      'Desça controlando até estender os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'A barra W alivia a tensão nos punhos em relação à barra reta.',
      'Pegada fechada enfatiza a cabeça longa; aberta, a curta.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1023': {
    muscles: 'Bíceps, com braquial e antebraços.',
    setup: [
      'Segure um halter em cada mão, braços estendidos ao lado do corpo.',
      'Palmas voltadas para a frente (ou para dentro, girando durante a subida).',
    ],
    steps: [
      'Suba os halteres dobrando os cotovelos, girando as palmas para cima.',
      'Contraia o bíceps no topo.',
      'Desça devagar até estender os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Pode alternar os braços ou subir os dois juntos.',
      'Mantenha os cotovelos apontando para o chão o tempo todo.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1024': {
    muscles: 'Bíceps (ênfase na cabeça longa), com braquial.',
    setup: [
      'Sente-se em um banco inclinado a 45–60°, costas apoiadas.',
      'Deixe os braços pendurados com os halteres, palmas para a frente.',
    ],
    steps: [
      'Suba os halteres sem tirar os cotovelos da linha do corpo.',
      'Aperte no topo, sem encostar os halteres nos ombros.',
      'Desça até alongar bem o bíceps.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'O alongamento no início é o diferencial deste exercício: não encurte a descida.',
      'Use cargas menores que na rosca em pé.',
    ],
    mistakes: [
      'Tirar as costas do banco.',
      'Levar os cotovelos para a frente.',
    ],
  },
  '1025': {
    muscles: 'Braquial e braquiorradial (antebraço), com bíceps.',
    setup: [
      'Segure os halteres com as palmas voltadas uma para a outra (pegada neutra).',
      'Braços estendidos ao lado do corpo.',
    ],
    steps: [
      'Suba os halteres mantendo a pegada neutra, como um martelo.',
      'Leve até a altura do ombro sem mover os cotovelos.',
      'Desça devagar.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Engrossa o braço e fortalece a pegada.',
      'Alterne os braços para manter a postura.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1026': {
    muscles: 'Bíceps, com foco no pico da contração.',
    setup: [
      'Sente-se no banco com as pernas afastadas.',
      'Apoie a parte de trás do braço na parte interna da coxa, halter pendurado.',
    ],
    steps: [
      'Suba o halter em direção ao ombro, sem tirar o braço da coxa.',
      'Aperte o bíceps no topo por um segundo.',
      'Desça até estender totalmente o braço.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Movimento lento e consciente: carga não é o objetivo aqui.',
      'Faça todas as repetições de um lado antes de trocar.',
    ],
    mistakes: ['Usar o tronco para ajudar.', 'Encurtar a descida.'],
  },
  '1027': {
    muscles: 'Bíceps (ênfase na cabeça curta) e braquial.',
    setup: [
      'Ajuste o banco Scott para que as axilas encostem no topo do apoio.',
      'Segure a barra (ou barra W) com as palmas para cima, braços apoiados.',
    ],
    steps: [
      'Suba a barra dobrando os cotovelos, braços colados no apoio.',
      'Pare antes dos antebraços ficarem verticais, mantendo tensão.',
      'Desça devagar até quase estender os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'O apoio impede o roubo: dá para isolar bem o bíceps.',
      'Controle a parte final da descida, onde o cotovelo fica mais exposto.',
    ],
    mistakes: [
      'Tirar os braços do apoio.',
      'Estender o cotovelo de uma vez embaixo.',
    ],
  },
  '1028': {
    muscles: 'Bíceps, com tensão constante do cabo.',
    setup: [
      'Encaixe uma barra reta na polia baixa e segure com as palmas para cima.',
      'Fique em pé perto da polia, cotovelos junto ao corpo.',
    ],
    steps: [
      'Suba a barra dobrando os cotovelos.',
      'Contraia o bíceps no topo.',
      'Desça controlando até estender os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'O cabo mantém tensão até o topo, diferente dos pesos livres.',
      'Bom para séries finais com mais repetições.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1029': {
    muscles: 'Braquiorradial (antebraço) e braquial, com bíceps.',
    setup: [
      'Segure a barra com as palmas para baixo, mãos na largura dos ombros.',
      'Braços estendidos, cotovelos junto ao corpo.',
    ],
    steps: [
      'Suba a barra dobrando os cotovelos, punhos retos.',
      'Leve até a altura do peito.',
      'Desça devagar.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Use menos carga que na rosca direta: o antebraço é o elo fraco.',
      'Mantenha os punhos alinhados com os antebraços.',
    ],
    mistakes: ['Dobrar os punhos.', 'Balançar o corpo.'],
  },
  '1030': {
    muscles: 'Bíceps na subida e antebraços na descida.',
    setup: [
      'Segure os halteres com as palmas para a frente, braços estendidos.',
      'Cotovelos junto ao corpo.',
    ],
    steps: [
      'Suba como uma rosca comum, palmas para cima.',
      'No topo, gire os punhos até as palmas ficarem para baixo.',
      'Desça devagar com as palmas para baixo e gire de volta embaixo.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'A descida em pronação é o que trabalha o antebraço: faça-a lenta.',
      'Carga moderada para manter o controle da rotação.',
    ],
    mistakes: ['Girar os punhos durante a subida.', 'Descer rápido.'],
  },
  '1031': {
    muscles: 'Bíceps (ênfase no pico da contração).',
    setup: [
      'Deite-se de bruços em um banco inclinado, peito apoiado no topo.',
      'Deixe os braços pendurados na vertical, segurando a barra ou os halteres.',
    ],
    steps: [
      'Suba a carga dobrando apenas os cotovelos.',
      'Aperte o bíceps no topo por um segundo.',
      'Desça até estender os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Os braços ficam perpendiculares ao chão: o bíceps trabalha mais no topo.',
      'Cargas leves e repetições controladas.',
    ],
    mistakes: ['Mover os ombros.', 'Encurtar a descida.'],
  },
  '1032': {
    muscles: 'Bíceps (cabeça longa), com antebraços.',
    setup: [
      'Segure a barra com as palmas para cima, mãos na largura dos ombros.',
      'Fique em pé com a barra encostada nas coxas.',
    ],
    steps: [
      'Suba a barra "arrastando" pelo corpo, levando os cotovelos para trás.',
      'Leve até o meio do peito.',
      'Desça pelo mesmo caminho, colada ao corpo.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Os cotovelos vão para trás, não para a frente: é o oposto da rosca comum.',
      'Use menos carga que na rosca direta.',
    ],
    mistakes: ['Afastar a barra do corpo.', 'Subir os ombros.'],
  },
  '1033': {
    muscles: 'Braquial e braquiorradial, com bíceps.',
    setup: [
      'Segure os halteres com pegada neutra ao lado do corpo.',
      'Fique em pé com o tronco firme.',
    ],
    steps: [
      'Suba um halter cruzando à frente do corpo em direção ao ombro oposto.',
      'Mantenha a pegada neutra durante todo o movimento.',
      'Desça devagar e alterne os braços.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'O cruzamento muda o ângulo e enfatiza o braquial.',
      'Mantenha o cotovelo próximo ao tronco.',
    ],
    mistakes: ['Girar o tronco junto com o braço.', 'Usar impulso.'],
  },
  '1034': {
    muscles: 'Braquial e braquiorradial, com bíceps.',
    setup: [
      'Encaixe a corda na polia baixa e segure as pontas com pegada neutra.',
      'Fique em pé perto da polia, cotovelos junto ao corpo.',
    ],
    steps: [
      'Suba a corda até a altura do peito, mantendo as palmas frente a frente.',
      'Afaste levemente as pontas da corda no topo.',
      'Desça controlando.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Tensão constante do cabo: ótimo para finalizar o treino de braço.',
      'Cotovelos parados, como na rosca martelo com halteres.',
    ],
    mistakes: CURL_MISTAKES,
  },
  '1035': {
    muscles: 'Bíceps, isolado.',
    setup: [
      'Ajuste o assento para que as axilas encostem no topo do apoio.',
      'Segure os pegadores com os braços quase estendidos.',
    ],
    steps: [
      'Dobre os cotovelos levando os pegadores em direção aos ombros.',
      'Contraia o bíceps no topo.',
      'Volte devagar sem estender totalmente o cotovelo.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'A máquina guia o movimento: concentre-se na contração.',
      'Ótimo para séries até a falha com segurança.',
    ],
    mistakes: ['Levantar o quadril do banco.', 'Deixar o peso cair na volta.'],
  },
  '1036': {
    muscles: 'Bíceps, um lado por vez.',
    setup: [
      'Encaixe um pegador de mão na polia baixa.',
      'Fique de lado ou de frente para a polia, braço estendido.',
    ],
    steps: [
      'Suba o pegador dobrando o cotovelo, palma para cima.',
      'Aperte o bíceps no topo.',
      'Desça devagar até estender o braço.',
    ],
    breathing: 'Solte o ar na subida e inspire na descida.',
    tips: [
      'Ajuda a equilibrar a força entre os braços.',
      'Experimente ficar de costas para a polia para alongar mais o bíceps.',
    ],
    mistakes: ['Girar o tronco.', 'Tirar o cotovelo do lugar.'],
  },
};
