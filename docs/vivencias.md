# Vivências e modal de avaliações

## Área pública

- `/vivencias`: feed paginado, com capa, título, cliente, nota, hospedagem e
  duração da estadia. Somente vivências publicadas aparecem.
- `/vivencias/:id`: relato completo, galeria de fotos/vídeos, tempo de hospedagem,
  avaliação com foto/nome do cliente, nota de 0 a 5, comentário, nome da hospedagem
  e contato opcional. `@usuario` gera um link para o Instagram.
- Quando há uma hospedagem vinculada e seu anúncio está publicado, o botão
  **Conhecer a hospedagem** leva ao anúncio. Se o anúncio for removido, o nome
  informado na vivência continua preservado, mas o vínculo é removido.
- A galeria é compartilhada com os detalhes de hospedagens: recorte proporcional
  nas miniaturas e `contain` no modal, navegação por teclado e vídeos com controles.

## Administração

**Vivências** aparece abaixo de **Minhas hospedagens** no menu administrativo.

1. Clique em **Cadastrar vivência** e informe título, descrição, tempo de
   hospedagem (por exemplo, “4 noites”), nome da hospedagem e dados do cliente.
2. Opcionalmente, busque e vincule um anúncio existente. O nome exibido permanece
   editável para preservar o contexto do relato.
3. Cadastre foto do cliente, nota, comentário e contato opcional. A foto é
   obrigatória na criação; em uma edição, deixá-la vazia mantém a foto atual.
4. Salve como rascunho, envie as fotos/vídeos e selecione a capa. É possível
   reordenar e excluir as mídias. O limite é de 30 mídias por vivência: JPG/PNG
   até 15 MB e MP4/WebM até 100 MB.
   A estrela permite selecionar imagem ou vídeo como capa de uma vivência.
   O primeiro vídeo também se torna capa se ainda não houver uma mídia principal;
   adicionar fotos depois não substitui uma capa já escolhida.
5. Marque **Publicar vivência no site** e salve. Desmarque para retirar do feed.

Rascunhos, seus retratos e suas mídias só podem ser consultados por administradores.
A exclusão exige confirmação e remove o relato e suas próprias mídias. Não exclui
a hospedagem nem as avaliações independentes da home. Fotos, relatos e contatos
devem ser publicados com autorização do cliente.

A avaliação preenchida no formulário de Vivências pertence ao relato. Ela não
cria, substitui ou remove automaticamente avaliações da home, cujo CRUD permanece
em **Configurações → Avaliações de hóspedes**.

## Seis avaliações na home

A home mostra somente as seis avaliações mais recentes e a média geral. Se houver
mais, **Visualizar todas as avaliações** abre um modal grande e responsivo. Os
comentários são exibidos integralmente, com rolagem interna. O botão **Carregar
mais avaliações** busca lotes de 30 até chegar a todos os cadastros, sem limitar
o total a 30 ou 50. Escape e o botão de fechar encerram o modal; o foco volta ao
botão de abertura. Em celular os comentários ficam em uma coluna.

## Persistência e compatibilidade

A migração Flyway `V7__vivencias.sql` cria `vivencia` e permite que cada mídia
pertença a uma hospedagem **ou** a uma vivência. Uma restrição impede mídias sem
proprietário ou com dois proprietários. As chaves de arquivos existentes não são
alteradas. A migração não apaga imóveis, avaliações, configurações ou mídias.

Novas mídias usam `experiences/` no armazenamento configurado. O processamento de
imagens preserva proporção e orientação EXIF. As remoções usam a fila transacional
de exclusão; uploads não confirmados tentam limpar os objetos criados no rollback.
Falhas de limpeza são registradas nos logs.

As APIs de leitura ficam em `/api/public/experiences`; o CRUD e os endpoints de
mídia em `/api/admin/experiences`, protegidos por autenticação administrativa e
CSRF. A lista usa paginação (até 50 itens por página). O formulário principal é
multipart com parte JSON `experience` e foto do cliente em `file`.

## Validação e atualização

Validação executada em infraestrutura local isolada:

- 48 testes Java, incluindo integração com PostgreSQL/MinIO e migrações Flyway.
- 8 testes unitários do frontend e build TypeScript/Vite.
- 12 cenários Playwright em desktop, celular vertical e horizontal, cobrindo
  cadastro/publicação/exclusão de vivências, imagem/vídeo, galeria e avaliações.
- O cenário do modal verifica 62 comentários, acessíveis em lotes, com somente
  seis cards na home e restauração de foco ao fechar.

Regressão de mídias: a consulta que serve arquivos carrega explicitamente o
proprietário (hospedagem ou vivência) antes de verificar a publicação. Isso evita
ler valores padrão de proxies Hibernate e devolver 404 para vivências publicadas.
Os testes limpam o contexto de persistência antes das leituras para simular novas
requisições, cobrindo foto, miniatura, vídeo com Range e privacidade de rascunhos.
A correção não muda chaves S3 nem exige reenviar as mídias existentes; basta
recompilar e atualizar o serviço `api` com os mesmos volumes e configuração.

Prévia de vídeos: a galeria e a capa do feed exibem um quadro do próprio vídeo,
com indicador de reprodução. Não há autoplay no feed. A prévia usa a decodificação
do navegador, sem reprocessar os vídeos ou criar novos objetos no armazenamento;
funciona também para vídeos já cadastrados. Arquivos não decodificáveis pelo
navegador exibem uma alternativa para abrir o vídeo. A reprodução com controles
fica no modal. As capas de vídeo são permitidas em Vivências; o catálogo de
hospedagens mantém a seleção de imagens como capa.

Para aplicar essa correção de prévia/capa, atualize **api e web**, pois ela inclui
mudanças no frontend e na seleção da mídia principal na API. Não há nova migração
nem necessidade de reenviar os arquivos.

`npm run test:images` inclui as suítes isoladas de imagens, avaliações e vivências.
`mvn test` exige serviços e credenciais dedicados a testes, nunca produção.

Não houve deploy. Para atualizar uma instalação existente, preserve `.env`, os
volumes e o nome do projeto Compose, baixe a `main`, compile e recrie somente
`api` e `web`, seguindo o guia de [atualização](avaliacoes.md#implantação-futura).
A API aplicará V7 automaticamente; API e frontend devem ser atualizados juntos.
Na instalação local identificada nesta conversa, o projeto é
`prive-lopes-avaliacao`, portanto os comandos Compose precisam de
`-p prive-lopes-avaliacao -f compose.yaml`. Não remova volumes nem use `down -v`
na instalação que contém os registros do usuário.
