# FF-035 - Rankings sociais

## Participacao

- Rankings sao opcionais e desativados por padrao.
- O usuario pode entrar ou sair a qualquer momento.
- Sair remove o usuario de todas as classificacoes sem apagar seus treinos.
- A preferencia faz parte do perfil social e entra na fila de sincronizacao offline.

## Privacidade

- O ranking mostra apenas nome, nome de usuario, avatar e pontuacao agregada.
- Treinos, series, pesos individuais, notas e historico privado nao sao expostos.
- Perfis bloqueados em qualquer direcao nao aparecem na classificacao.
- Um perfil privado pode participar porque o opt-in autoriza somente a pontuacao agregada.

## Metricas

- Volume: soma do volume de series de trabalho concluidas no periodo.
- Frequencia: quantidade de treinos concluidos no periodo.
- Consistencia: percentual de semanas do periodo com pelo menos um treino concluido.
- Empates sao ordenados pelo nome de exibicao para manter resultado deterministico.

## Periodos

As classificacoes usam janelas moveis de 30, 90 e 365 dias. Todas as pessoas de uma
classificacao sao calculadas com os mesmos limites de data e a mesma funcao de metrica.

## Experiencia

A tela fica em `Perfil > Amigos > Rankings sociais`. Ela nao adiciona outra aba principal
e mantem as funcoes competitivas fora do fluxo central de treino.
