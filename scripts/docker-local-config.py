#!/usr/bin/env python3
"""Mantém o estado do Buildx em local gravável e reutiliza a autenticação existente."""
from pathlib import Path
import os

root = Path(__file__).resolve().parent.parent
local = root / '.local/docker'
source = Path(os.environ.get('DOCKER_CONFIG', str(Path.home() / '.docker'))) / 'config.json'
local.mkdir(parents=True, exist_ok=True)
local.chmod(0o700)
target = local / 'config.json'
if source.resolve() != target.resolve() and source.exists() and not target.exists() and not target.is_symlink():
    target.symlink_to(source)
