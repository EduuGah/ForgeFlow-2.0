# FF-034 - Amigos e privacidade social

## Objetivo

Adicionar conexoes sociais sem desviar o ForgeFlow do fluxo principal de treino.
A area fica acessivel pelo Perfil e nao ocupa uma nova aba principal.

## Descoberta de pessoas

- A pesquisa usa exclusivamente nome de exibicao e nome de usuario.
- Email nunca e indexado, exibido ou aceito como criterio de pesquisa.
- Perfis privados continuam aparecendo com informacoes basicas para permitir o envio de pedidos.
- Usuarios bloqueados em qualquer direcao deixam de aparecer nos resultados.

## Relacionamentos

- Um pedido nasce como `pending` e somente o destinatario pode aceitar ou recusar.
- Somente participantes podem remover uma amizade aceita.
- Bloquear alguem encerra qualquer pedido ou amizade ativa entre as duas pessoas.
- Desbloquear nao restaura automaticamente a amizade anterior.
- Pedidos, respostas, remocoes, bloqueios e preferencias entram na fila de sincronizacao offline.

## Privacidade

- Perfil privado: estatisticas de treino somente podem ser vistas por amigos aceitos.
- Compartilhamento de estatisticas: permite desativar os dados de treino mesmo para amigos.
- Dados basicos de busca sao nome, nome de usuario, avatar e biografia.
- A autorizacao sempre usa o usuario autenticado; IDs recebidos da interface nao provam propriedade.

## Preview local

O preview web e o banco local recebem perfis ficticios para exercitar pesquisa, pedidos e
bloqueios. A carga e versionada e nao sobrescreve preferencias alteradas pelo usuario em
inicializacoes posteriores.
