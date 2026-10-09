#!/usr/bin/env python3
"""Inicialização local reproduzível; não exporta senhas em argumentos ou logs."""
from pathlib import Path
import os
import sys
import signal
import subprocess
import urllib.request
import urllib.error
import time
import json
import socket
import shutil

ROOT = Path(__file__).resolve().parent.parent
LOCAL = ROOT / '.local'


def environment():
    values = {}
    for line in (ROOT / '.env').read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    env = os.environ.copy()
    env.update(values)
    env.update(DATABASE_URL=f"jdbc:postgresql://127.0.0.1:5432/{values.get('POSTGRES_DB', 'imoveis')}",
               DATABASE_USERNAME=values.get('POSTGRES_USER', 'imoveis'), DATABASE_PASSWORD=values['POSTGRES_PASSWORD'],
               S3_ENDPOINT='http://127.0.0.1:9000', S3_BUCKET='imoveis', S3_REGION='us-east-1', S3_CREATE_BUCKET='true',
               JAVA_HOME=str(LOCAL / 'tools/jdk'))
    if Path('/etc/ssl/certs/java/cacerts').exists():
        env['MAVEN_OPTS'] = env.get('MAVEN_OPTS', '') + ' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts'
    return env


def request(url):
    # Apenas verificações locais; não encaminhar localhost ao proxy externo.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(url, timeout=3) as response:
        return response.read()


def alive(name):
    pid_file = LOCAL / f'{name}.pid'
    start_file = LOCAL / f'{name}.pid-start'
    if not pid_file.exists() or not start_file.exists():
        return False
    pid = int(pid_file.read_text())
    try:
        cmd = Path(f'/proc/{pid}/cmdline').read_bytes().replace(b'\0', b' ').decode()
        started = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()[19]
        return started == start_file.read_text() and (str(LOCAL / 'api-runtime.jar') in cmd if name == 'api' else 'npm run dev' in cmd or 'vite' in cmd)
    except (OSError, ValueError):
        return False


def start_process(name, command, cwd, env, port):
    if alive(name):
        return
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise SystemExit(f'Porta {port} ocupada por outro processo; não foi alterado.')
    if name == 'api':
        shutil.copyfile(ROOT / 'backend/target/imoveis-1.0.0.jar', LOCAL / 'api-runtime.jar')
    with (LOCAL / f'{name}.log').open('a') as log:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    (LOCAL / f'{name}.pid').write_text(str(process.pid))
    (LOCAL / f'{name}.pid-start').write_text(Path(f'/proc/{process.pid}/stat').read_text().rsplit(')', 1)[1].split()[19])


def ready():
    health = json.loads(request('http://127.0.0.1:8080/actuator/health'))
    settings = json.loads(request('http://127.0.0.1:5173/api/public/settings'))
    page = json.loads(request('http://127.0.0.1:5173/api/public/properties?size=1'))
    html = request('http://127.0.0.1:5173/')
    request('http://127.0.0.1:9000/minio/health/live')
    for property in page.get('content', []):
        images = [media for media in property.get('media', []) if media['type'] == 'IMAGEM']
        if images:
            thumbnail = request('http://127.0.0.1:5173' + images[0].get('thumbnailUrl', images[0]['url']))
            if not thumbnail.startswith(b'\xff\xd8'):
                return False
    return health.get('status') == 'UP' and bool(settings.get('name')) and 'content' in page and b'id="root"' in html


def main():
    LOCAL.mkdir(exist_ok=True)
    action = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if action == 'stop':
        for name in ['web', 'api']:
            if alive(name):
                pid = int((LOCAL / f'{name}.pid').read_text())
                os.killpg(pid, signal.SIGTERM)
                for _ in range(50):
                    if not alive(name):
                        break
                    time.sleep(0.1)
                if alive(name):
                    os.killpg(pid, signal.SIGKILL)
                (LOCAL / f'{name}.pid').unlink(missing_ok=True)
                (LOCAL / f'{name}.pid-start').unlink(missing_ok=True)
        print('Processos iniciados por este script foram encerrados. Volumes e serviços de infraestrutura preservados.')
    elif action == 'start':
        env = environment()
        subprocess.run(['docker', 'compose', 'up', '-d', 'postgres', 'minio'], cwd=ROOT, check=True)
        start_process('api', [str(LOCAL / 'tools/jdk/bin/java'), '-jar', str(LOCAL / 'api-runtime.jar')], ROOT / 'backend', env, 8080)
        start_process('web', ['npm', 'run', 'dev', '--', '--port', '5173', '--strictPort'], ROOT / 'frontend', env, 5173)
        for attempt in range(45):
            try:
                if ready():
                    print('API, banco, catálogo e frontend responderam às verificações de prontidão.')
                    return
            except (OSError, ValueError, urllib.error.URLError):
                pass
            if not alive('api') or not alive('web'):
                raise SystemExit('Inicialização interrompida. Consulte .local/api.log e .local/web.log.')
            if attempt % 10 == 0:
                print('Aguardando inicialização dos serviços…', flush=True)
            time.sleep(1)
        raise SystemExit('Serviços não ficaram prontos no prazo. Consulte os logs em .local/.')
    elif action == 'test':
        env = environment()
        subprocess.run([str(LOCAL / 'tools/maven/bin/mvn'), '-s', str(LOCAL / 'maven-settings.xml'), '-B', 'verify'], cwd=ROOT / 'backend', env=env, check=True)
        subprocess.run(['npm', 'test'], cwd=ROOT / 'frontend', check=True)
        subprocess.run(['npm', 'run', 'build'], cwd=ROOT / 'frontend', check=True)
    elif action == 'status':
        if not ready():
            raise SystemExit('Verificação de prontidão falhou.')
        print('API, banco, catálogo e frontend verificados.')
    else:
        raise SystemExit('Uso: cloud-dev.py start|stop|status|test')


if __name__ == '__main__':
    main()
