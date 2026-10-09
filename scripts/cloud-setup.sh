#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
tools_root="$project_root/.local/tools"
# Evita que o Vite escreva em node_modules durante a instalação congelada.
if [ -f "$project_root/.local/web.pid-start" ] || [ -f "$project_root/.local/api.pid-start" ]; then
  python3 "$project_root/scripts/cloud-dev.py" stop
fi
mkdir -p "$tools_root" "$project_root/.local/m2" "$project_root/.local/npm-cache"
python3 "$project_root/scripts/docker-local-config.py"
export DOCKER_CONFIG="$project_root/.local/docker"
# A imagem oficial fornece o JDK e Maven completos, sem alterar o sistema.
if [ ! -x "$tools_root/jdk/bin/javac" ] || [ ! -x "$tools_root/maven/bin/mvn" ]; then
  tool_container="$(docker create maven@sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237)"
  trap 'docker rm "$tool_container" >/dev/null' EXIT
  if [ ! -x "$tools_root/jdk/bin/javac" ]; then docker cp "$tool_container:/opt/java/openjdk" "$tools_root/jdk"; fi
  if [ ! -x "$tools_root/maven/bin/mvn" ]; then docker cp "$tool_container:/usr/share/maven" "$tools_root/maven"; fi
  docker rm "$tool_container" >/dev/null
  trap - EXIT
fi
export JAVA_HOME="$tools_root/jdk"
if [ -f /etc/ssl/certs/java/cacerts ]; then export MAVEN_OPTS="${MAVEN_OPTS:-} -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts"; fi
python3 "$project_root/scripts/maven-settings.py"
python3 "$project_root/scripts/init-local-env.py"
cd "$project_root/frontend"
npm ci --cache "$project_root/.local/npm-cache" --no-audit --no-fund
npm run build
cd "$project_root/backend"
"$tools_root/maven/bin/mvn" -s "$project_root/.local/maven-settings.xml" -B -DskipTests package
cd "$project_root"
docker compose pull postgres minio
echo 'Ferramentas, dependências e builds preparados. Inicie com python3 scripts/cloud-dev.py start.'
