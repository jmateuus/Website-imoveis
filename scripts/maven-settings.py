#!/usr/bin/env python3
"""Usa o proxy HTTPS fornecido pelo ambiente, mantendo verificação TLS."""
from pathlib import Path
import os
import urllib.parse
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
settings = ET.Element('settings', xmlns='http://maven.apache.org/SETTINGS/1.0.0')
ET.SubElement(settings, 'localRepository').text = str(root / '.local/m2')
proxy_url = os.environ.get('HTTPS_PROXY', os.environ.get('https_proxy', ''))
proxy = urllib.parse.urlsplit(proxy_url)
if proxy.hostname:
    if proxy.username or proxy.password:
        raise SystemExit('Proxy autenticado: use a configuração Maven existente; não copie credenciais para este arquivo.')
    element = ET.SubElement(ET.SubElement(settings, 'proxies'), 'proxy')
    for key, value in {'id': 'cloud', 'active': 'true', 'protocol': 'http', 'host': proxy.hostname,
                       'port': str(proxy.port or 80), 'nonProxyHosts': 'localhost|127.0.0.1|postgres|minio'}.items():
        ET.SubElement(element, key).text = value
(root / '.local').mkdir(exist_ok=True)
ET.ElementTree(settings).write(root / '.local/maven-settings.xml', encoding='utf-8', xml_declaration=True)
