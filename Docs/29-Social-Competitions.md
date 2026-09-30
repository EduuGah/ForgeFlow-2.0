# FF-037 - Competicoes sociais

## Regras e periodos

- A criacao define titulo, metrica, periodo de inscricao e duracao.
- Cada conjunto de regras recebe uma versao persistida.
- Ao iniciar, metrica, datas e versao nao possuem operacao de edicao no cliente.
- Inscricoes e cancelamentos so sao aceitos antes do inicio.

## Pontuacao auditavel

A classificacao provisoria usa a mesma funcao agregada dos rankings e desafios. Ela e
derivada dos treinos concluidos no periodo; nao existe repositorio ou servico cliente para
gravar uma pontuacao arbitraria. Nome, usuario e valor agregado sao os unicos dados sociais
exibidos.

## Resultado oficial

O resultado final e uma entidade separada contendo versao das regras, horario de
finalizacao e classificacao ordenada. A aplicacao exige origem `server` e rejeita versoes
divergentes. Depois de persistido, o historico apresenta o resultado como oficial.

## Offline e sincronizacao

Criacao, inscricao e cancelamento atualizam o armazenamento local e a outbox na mesma
transacao. Participantes sao unicos por usuario e competicao. Resultados chegam pela
sincronizacao autoritativa e nao geram uma nova mutacao cliente.
