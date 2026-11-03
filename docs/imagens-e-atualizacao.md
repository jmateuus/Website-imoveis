# Imagens e atualização futura

## Correção

Cards e collage usam `cover`, com recorte central e sem deformação. O modal usa
`contain` em uma área limitada explicitamente à janela; o grid não pode crescer
com o tamanho intrínseco da mídia. Título longo tem rolagem própria e os controles
permanecem disponíveis, inclusive em celular na horizontal. `image-orientation:
from-image` respeita metadados ainda presentes em arquivos servidos ao navegador.

O frontend envia o arquivo selecionado sem canvas, recorte ou redimensionamento.
A API já reduzia proporcionalmente o maior lado para 1920 px (foto) e 480 px
(miniatura), sem ampliar imagens pequenas. Continua convertendo para JPEG com
fundo branco para transparência. Agora normaliza as oito orientações EXIF antes
de gerar ambas as versões e arredonda as dimensões ao pixel mais próximo.
A leitura EXIF usa [metadata-extractor 2.19.0](https://github.com/drewnoakes/metadata-extractor).

Nenhuma migração, chave S3 ou mídia existente foi alterada. O ajuste de exibição
beneficia as imagens existentes ao atualizar o frontend. A normalização EXIF vale
para novos uploads. Uma foto já convertida com orientação incorreta e sem o EXIF
original não pode ser recuperada pelo CSS; eventual substituição exige o arquivo
original e uma ação separada do proprietário. Fotos pequenas continuam limitadas
pela resolução e uma miniatura recortada pode omitir detalhes; abra o modal para
ver o enquadramento inteiro.

## Validação isolada

```bash
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:images
cd ../backend
mvn -Dtest=MediaServiceTest test
```

Java 21 é necessário. `CHROMIUM_PATH` pode selecionar um Chrome já instalado.
A suíte de imagens inicia seu próprio Vite na porta 5174 e simula todas as APIs
e imagens: não requer PostgreSQL ou MinIO. Cobre imagens verticais, panorâmicas,
quadradas, pequenas e de 1 px de largura, cards/collage, navegação por teclado,
fechamento, título longo e controles dentro da janela em três tamanhos de tela.
Os testes Java não iniciam Spring nem conectam aos serviços. A suíte de integração
do catálogo só deve ser executada em infraestrutura dedicada a testes.

## Atualização futura da VPS — não executada nesta tarefa

Os comandos abaixo pressupõem a instalação existente com `compose.yaml`, serviços
`api`/`web` e infraestrutura já em execução. Use o mesmo diretório, `.env`, projeto
Compose e arquivos de override usados na implantação atual. Se a VPS usa outro
gerenciador ou imagens prebuilt, adapte o procedimento antes de executar; não
inicialize uma instalação nova sobre a existente.

Antes, confirme backups recuperáveis do PostgreSQL e do armazenamento. Confira os
volumes montados nos containers atuais (o Compose do repositório declara
`postgres-data` e `minio-data`), sem renomear projeto ou volumes. Não exiba `.env`
ou `docker compose config` completo em logs compartilhados, pois contêm segredos.

Execute na raiz do checkout existente, em Bash, interrompendo em caso de erro:

```bash
set -eu
test "$(git branch --show-current)" = 'feature/prive-lopes-hospedagens'
test -z "$(git status --porcelain)"
git fetch origin feature/prive-lopes-hospedagens
git log --oneline HEAD..origin/feature/prive-lopes-hospedagens
# Revisar os commits acima antes de prosseguir.
git merge --ff-only origin/feature/prive-lopes-hospedagens
docker compose ps
docker compose config --volumes
docker inspect "$(docker compose ps -q postgres)" --format '{{json .Mounts}}'
docker inspect "$(docker compose ps -q minio)" --format '{{json .Mounts}}'
docker compose build api web
docker compose up -d --no-deps --wait api web
docker compose ps
docker compose logs --tail=80 api web
curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8088/
```

Valide também a URL pública e abra uma foto vertical e uma panorâmica no modal.
A API reinicia e sessões em memória exigem novo login. Este patch não adiciona
migrações; se houver outros commits pendentes, revise suas migrações antes da
atualização. Para aplicar somente a correção visual sem atualizar a API, use
`docker compose build web` e `docker compose up -d --no-deps --wait web`.

O `up` recria os serviços indicados preservando volumes montados, conforme a
[documentação do Docker](https://docs.docker.com/reference/cli/docker/compose/up/).
`--no-deps` evita recriar PostgreSQL/MinIO. Não execute `down -v`, `volume rm`,
`volume prune` ou scripts de reset/inicialização; não substitua o `.env`, o projeto
Compose ou os diretórios de dados. Nenhum desses comandos de VPS foi executado.
