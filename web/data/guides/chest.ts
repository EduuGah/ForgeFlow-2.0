import type { GuideMap } from './types';

const PRESS_BREATHING = 'Inspire na descida e solte o ar ao empurrar.';

export const CHEST_GUIDES: GuideMap = {
  '1037': {
    muscles: 'Peitoral, com tríceps e parte da frente do ombro.',
    setup: [
      'Deite-se com os olhos abaixo da barra, pés firmes no chão.',
      'Aperte as escápulas e segure a barra um pouco além da largura dos ombros.',
    ],
    steps: [
      'Tire a barra do suporte e posicione-a sobre os ombros.',
      'Desça até a linha do peito (perto dos mamilos), cotovelos a uns 45° do tronco.',
      'Empurre a barra para cima e levemente para trás, até estender os braços.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Mantenha as escápulas apertadas e o peito alto durante toda a série.',
      'Use um parceiro ou travas de segurança em cargas altas.',
    ],
    mistakes: [
      'Quicar a barra no peito.',
      'Abrir os cotovelos a 90°, o que sobrecarrega os ombros.',
      'Tirar o quadril do banco.',
    ],
  },
  '1038': {
    muscles: 'Parte superior do peitoral, com ombros e tríceps.',
    setup: [
      'Ajuste o banco a 30–45° e deite-se com os olhos abaixo da barra.',
      'Escápulas apertadas, pegada um pouco além dos ombros.',
    ],
    steps: [
      'Desça a barra até a parte de cima do peito.',
      'Mantenha os cotovelos levemente fechados.',
      'Empurre até estender os braços sobre os ombros.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Inclinações acima de 45° passam a trabalhar mais os ombros.',
      'Mantenha os pés firmes para dar estabilidade.',
    ],
    mistakes: ['Descer a barra no meio do peito.', 'Arquear demais a lombar.'],
  },
  '1039': {
    muscles: 'Parte inferior do peitoral, com tríceps.',
    setup: [
      'Prenda os pés no apoio do banco declinado e deite-se.',
      'Segure a barra um pouco além dos ombros.',
    ],
    steps: [
      'Desça a barra até a parte de baixo do peito.',
      'Empurre até estender os braços.',
      'Mantenha o controle durante todo o percurso.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Peça ajuda para tirar e devolver a barra: a posição dificulta.',
      'O percurso é curto: não precisa de cargas exageradas.',
    ],
    mistakes: [
      'Deixar a barra cair em direção ao pescoço.',
      'Quicar no peito.',
    ],
  },
  '1040': {
    muscles: 'Peitoral, com tríceps e ombros.',
    setup: [
      'Sente-se com os halteres nas coxas e deite levando-os junto ao peito.',
      'Halteres na linha do peito, palmas para a frente ou levemente para dentro.',
    ],
    steps: [
      'Empurre os halteres para cima até estender os braços.',
      'Aproxime-os no topo sem deixar que batam.',
      'Desça devagar até sentir o peito alongar.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Os halteres permitem maior amplitude que a barra.',
      'Para terminar, apoie os halteres nas coxas e sente-se.',
    ],
    mistakes: [
      'Descer pouco.',
      'Deixar os halteres se afastarem demais na descida.',
    ],
  },
  '1041': {
    muscles: 'Parte superior do peitoral, com ombros e tríceps.',
    setup: [
      'Ajuste o banco a 30–45°.',
      'Comece com os halteres na altura do peito, cotovelos a 45°.',
    ],
    steps: [
      'Empurre os halteres para cima, aproximando-os no topo.',
      'Mantenha as escápulas apertadas no banco.',
      'Desça devagar até a altura do peito.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Uma pegada levemente neutra costuma poupar os ombros.',
      'Controle a descida: é aqui que o peito mais trabalha.',
    ],
    mistakes: [
      'Banco inclinado demais (vira desenvolvimento).',
      'Bater os halteres no topo.',
    ],
  },
  '1042': {
    muscles: 'Parte inferior do peitoral, com tríceps.',
    setup: [
      'Prenda os pés no banco declinado e deite-se com os halteres no peito.',
      'Palmas para a frente, cotovelos a 45°.',
    ],
    steps: [
      'Empurre os halteres até estender os braços.',
      'Desça devagar até a linha do peito.',
      'Mantenha os punhos sobre os cotovelos.',
    ],
    breathing: PRESS_BREATHING,
    tips: [
      'Comece com cargas leves para se acostumar à posição.',
      'Peça ajuda para posicionar os halteres se forem pesados.',
    ],
    mistakes: [
      'Descer os halteres para o pescoço.',
      'Perder o controle no final da série.',
    ],
  },
  '1043': {
    muscles: 'Peitoral, tríceps e ombros, com core.',
    setup: [
      'Mãos no chão um pouco além dos ombros, dedos para a frente.',
      'Corpo reto da cabeça aos calcanhares, abdômen e glúteos contraídos.',
    ],
    steps: [
      'Desça o corpo dobrando os cotovelos a cerca de 45° do tronco.',
      'Chegue com o peito perto do chão.',
      'Empurre o chão até estender os braços, sem perder o alinhamento.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Para facilitar, apoie os joelhos ou as mãos em um banco.',
      'Para dificultar, eleve os pés ou use uma mochila com peso.',
    ],
    mistakes: ['Deixar o quadril cair.', 'Fazer só metade do movimento.'],
  },
  '1044': {
    muscles:
      'Peitoral (parte inferior) e tríceps — versão mais fácil da flexão.',
    setup: [
      'Apoie as mãos em um banco ou caixa, um pouco além dos ombros.',
      'Corpo reto, pés no chão.',
    ],
    steps: [
      'Desça o peito em direção à borda do banco.',
      'Mantenha os cotovelos a 45°.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Quanto mais alto o apoio, mais fácil.',
      'Abaixe o apoio aos poucos até chegar à flexão no chão.',
    ],
    mistakes: [
      'Quadril alto (posição de "V").',
      'Cabeça caindo para a frente.',
    ],
  },
  '1045': {
    muscles: 'Parte superior do peitoral e ombros, com tríceps.',
    setup: [
      'Apoie os pés em um banco e as mãos no chão, um pouco além dos ombros.',
      'Corpo reto, abdômen firme.',
    ],
    steps: [
      'Desça até o rosto ficar perto do chão.',
      'Mantenha o corpo alinhado.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Mais difícil que a flexão comum: diminua as repetições no início.',
      'Quanto mais alto o apoio dos pés, mais os ombros trabalham.',
    ],
    mistakes: ['Deixar a lombar afundar.', 'Abrir demais os cotovelos.'],
  },
  '1046': {
    muscles: 'Peitoral, com foco no alongamento.',
    setup: [
      'Deite-se no banco reto com os halteres acima do peito, palmas frente a frente.',
      'Cotovelos levemente dobrados (e assim permanecem).',
    ],
    steps: [
      'Abra os braços em um arco amplo, descendo os halteres para os lados.',
      'Desça até sentir o peito alongar, sem passar da linha dos ombros.',
      'Volte pelo mesmo arco, como se abraçasse uma árvore.',
    ],
    breathing: 'Inspire ao abrir e solte o ar ao fechar.',
    tips: [
      'Use cargas bem menores que no supino.',
      'Pense em aproximar os cotovelos, não as mãos.',
    ],
    mistakes: [
      'Dobrar e esticar os cotovelos (vira supino).',
      'Descer demais e forçar os ombros.',
    ],
  },
  '1047': {
    muscles: 'Parte superior do peitoral.',
    setup: [
      'Ajuste o banco a 30–45° e segure os halteres acima do peito.',
      'Palmas frente a frente, cotovelos levemente dobrados.',
    ],
    steps: [
      'Abra os braços em arco até sentir o peito alongar.',
      'Mantenha o mesmo ângulo dos cotovelos.',
      'Feche os braços contraindo o peito.',
    ],
    breathing: 'Inspire ao abrir e solte o ar ao fechar.',
    tips: [
      'Movimento lento, focado na contração.',
      'Cargas leves a moderadas.',
    ],
    mistakes: ['Bater os halteres no topo.', 'Arquear a lombar para ajudar.'],
  },
  '1048': {
    muscles: 'Peitoral (toda a extensão), com tensão constante do cabo.',
    setup: [
      'Ajuste as polias na altura dos ombros ou acima e segure um pegador em cada mão.',
      'Dê um passo à frente, tronco levemente inclinado, cotovelos um pouco dobrados.',
    ],
    steps: [
      'Traga as mãos para a frente e para baixo em um arco, até se encontrarem.',
      'Contraia o peito por um segundo.',
      'Volte devagar até sentir o peito alongar.',
    ],
    breathing: 'Solte o ar ao fechar os braços e inspire ao abrir.',
    tips: [
      'Polias altas enfatizam a parte de baixo do peito; baixas, a de cima.',
      'Mantenha o tronco parado durante a série.',
    ],
    mistakes: [
      'Usar o peso do corpo para puxar.',
      'Dobrar demais os cotovelos.',
    ],
  },
  '1049': {
    muscles: 'Parte superior do peitoral.',
    setup: [
      'Ajuste as polias na posição mais baixa e segure um pegador em cada mão.',
      'Fique no centro, um passo à frente, braços estendidos para baixo e para os lados.',
    ],
    steps: [
      'Suba as mãos em arco até a altura do peito, à frente do corpo.',
      'Aproxime as mãos e contraia a parte de cima do peito.',
      'Volte devagar.',
    ],
    breathing: 'Solte o ar ao subir e inspire na volta.',
    tips: [
      'Ótimo complemento ao supino inclinado.',
      'Cotovelos levemente dobrados e fixos.',
    ],
    mistakes: ['Subir as mãos acima dos ombros.', 'Encolher os ombros.'],
  },
  '1050': {
    muscles: 'Peitoral, isolado.',
    setup: [
      'Ajuste o banco para os pegadores ficarem na altura do peito.',
      'Costas apoiadas, braços abertos com os cotovelos levemente dobrados.',
    ],
    steps: [
      'Feche os braços à frente do corpo até os pegadores quase se tocarem.',
      'Segure a contração um instante.',
      'Volte devagar até sentir o peito alongar.',
    ],
    breathing: 'Solte o ar ao fechar e inspire ao abrir.',
    tips: [
      'Mantenha as escápulas encostadas no banco.',
      'Bom para séries com mais repetições.',
    ],
    mistakes: [
      'Deixar os pesos baterem na volta.',
      'Projetar os ombros para a frente.',
    ],
  },
  '1051': {
    muscles: 'Parte inferior do peitoral, com tríceps e ombros.',
    setup: [
      'Apoie-se nas paralelas com os braços estendidos.',
      'Incline o tronco à frente e dobre levemente os joelhos.',
    ],
    steps: [
      'Desça dobrando os cotovelos, que se abrem um pouco para os lados.',
      'Desça até sentir o peito alongar (ombros um pouco abaixo dos cotovelos).',
      'Empurre até estender os braços, mantendo a inclinação.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Quanto mais inclinado o tronco, mais o peito trabalha.',
      'Use a máquina assistida se ainda não consegue o peso do corpo.',
    ],
    mistakes: [
      'Descer além do confortável para os ombros.',
      'Balançar o corpo.',
    ],
  },
  '1052': {
    muscles: 'Peitoral (mais que na flexão comum), com ombros.',
    setup: [
      'Mãos bem mais abertas que os ombros, dedos levemente para fora.',
      'Corpo reto, abdômen firme.',
    ],
    steps: [
      'Desça o peito em direção ao chão.',
      'Mantenha o corpo alinhado.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Amplitude menor que a flexão comum: não force os ombros.',
      'Controle a descida.',
    ],
    mistakes: ['Abrir demais as mãos.', 'Deixar o quadril cair.'],
  },
  '1053': {
    muscles: 'Tríceps e parte interna do peitoral.',
    setup: [
      'Junte as mãos sob o peito formando um losango com indicadores e polegares.',
      'Corpo reto, pés juntos ou levemente afastados.',
    ],
    steps: [
      'Desça o peito em direção às mãos, cotovelos junto ao corpo.',
      'Chegue perto do chão.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Se incomodar os punhos, afaste um pouco as mãos.',
      'Apoie os joelhos para facilitar.',
    ],
    mistakes: ['Abrir os cotovelos.', 'Perder o alinhamento do corpo.'],
  },
  '1054': {
    muscles: 'Parte inferior do peitoral, com tríceps e ombros.',
    setup: [
      'Prenda a anilha no cinto de mergulho ou segure um halter entre os pés.',
      'Apoie-se nas paralelas com o tronco inclinado à frente.',
    ],
    steps: [
      'Desça dobrando os cotovelos até o peito alongar.',
      'Mantenha o tronco inclinado.',
      'Empurre até estender os braços.',
    ],
    breathing: 'Inspire na descida e solte o ar na subida.',
    tips: [
      'Só adicione carga quando fizer 12+ repetições com o peso do corpo.',
      'Aumente o peso aos poucos.',
    ],
    mistakes: ['Deixar a carga balançar.', 'Descer além do confortável.'],
  },
  '1055': {
    muscles: 'Parte média do peitoral.',
    setup: [
      'Ajuste as polias na altura do peito e segure um pegador em cada mão.',
      'Dê um passo à frente, braços abertos e cotovelos levemente dobrados.',
    ],
    steps: [
      'Traga as mãos à frente do peito em um arco horizontal.',
      'Aperte o peito quando as mãos se encontrarem.',
      'Volte devagar até alongar.',
    ],
    breathing: 'Solte o ar ao fechar e inspire ao abrir.',
    tips: [
      'Mantenha o tronco firme e parado.',
      'Pense em aproximar os cotovelos.',
    ],
    mistakes: ['Inclinar o corpo para puxar.', 'Encurtar a abertura.'],
  },
  '1056': {
    muscles: 'Peitoral, com tríceps e ombros.',
    setup: [
      'Ajuste o assento para os pegadores ficarem na altura do meio do peito.',
      'Costas apoiadas e escápulas apertadas.',
    ],
    steps: [
      'Empurre os pegadores até estender os braços, sem travar os cotovelos.',
      'Volte devagar até sentir o peito alongar.',
      'Mantenha o peito alto durante a série.',
    ],
    breathing: 'Solte o ar ao empurrar e inspire na volta.',
    tips: [
      'Seguro para treinar perto da falha.',
      'Pegada neutra poupa os ombros.',
    ],
    mistakes: ['Tirar as costas do encosto.', 'Deixar a carga bater na volta.'],
  },
  '1057': {
    muscles: 'Peitoral, isolado.',
    setup: [
      'Ajuste o assento para os braços ficarem na altura dos ombros.',
      'Apoie os antebraços nas almofadas (ou segure os pegadores).',
    ],
    steps: [
      'Feche os braços à frente do peito.',
      'Contraia o peito no centro por um segundo.',
      'Volte devagar até sentir o alongamento.',
    ],
    breathing: 'Solte o ar ao fechar e inspire ao abrir.',
    tips: [
      'Movimento curto e controlado.',
      'Bom finalizador do treino de peito.',
    ],
    mistakes: ['Usar impulso.', 'Abrir além da linha dos ombros.'],
  },
};
