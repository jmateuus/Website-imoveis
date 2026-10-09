#!/usr/bin/env python3
"""Gera credenciais exclusivamente locais; nunca sobrescreve um .env existente."""
from pathlib import Path
import secrets
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--demo', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
target = root / '.env'
try:
    with target.open('x') as out:
        target.chmod(0o600)
        out.write('POSTGRES_DB=imoveis\nPOSTGRES_USER=imoveis\n')
        out.write('POSTGRES_PASSWORD=' + secrets.token_urlsafe(32) + '\n')
        out.write('S3_ACCESS_KEY=morada-local\nS3_SECRET_KEY=' + secrets.token_urlsafe(32) + '\n')
        out.write('ADMIN_EMAIL=admin@morada.local\nADMIN_PASSWORD=' + secrets.token_urlsafe(24) + '\n')
        out.write('COOKIE_SECURE=false\nDEMO_DATA=' + ('true' if args.demo else 'false') + '\n')
    print('Configuração local criada em .env (permissão 600). Consulte a senha nesse arquivo; não publique-o.')
except FileExistsError:
    print('.env existente preservado.')
