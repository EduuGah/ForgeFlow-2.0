# FF-036 - Desafios sociais

## Ciclo de vida

- Um desafio nasce ativo e inclui automaticamente seu criador.
- Outras pessoas podem entrar enquanto ele estiver ativo e dentro do prazo.
- Qualquer participante pode sair; a saida permanece registrada para sincronizacao.
- O criador pode finalizar antes do prazo. Ao chegar ao fim, a interface o considera
  finalizado mesmo antes da proxima sincronizacao.

## Regras

- Metricas disponiveis: volume, frequencia e consistencia.
- Duracoes disponiveis: 7, 30 e 90 dias.
- Somente treinos concluidos entre o inicio e o fim contribuem para a pontuacao.
- O vencedor e quem possui a maior pontuacao; empates usam o nome de exibicao para uma
  ordem deterministica.
- A funcao de calculo e compartilhada com os rankings sociais para evitar divergencias.

## Progresso e privacidade

A classificacao mostra somente nome, nome de usuario, avatar e pontuacao agregada. Ela
nao revela series, pesos individuais, notas ou historico privado. O progresso e calculado
automaticamente a partir dos dados de treino locais e dos agregados sincronizados.

## Offline e sincronizacao

Desafios e participacoes possuem tabelas locais independentes. Criar, entrar, sair e
finalizar grava o estado local e uma operacao `upsert` na mesma transacao. A restricao
unica por desafio e usuario impede participacoes duplicadas durante reconciliacoes.

## Experiencia

A tela fica em `Perfil > Amigos > Desafios`, fora da navegacao principal. O formulario
de criacao explicita titulo, metrica, duracao e regra; cada cartao mostra periodo, estado,
classificacao e apenas as acoes validas para o usuario atual.
