"""Download original brand assets and switch index.html to local image paths.

Run from any directory: python images/stack/download-originals.py
Only successfully downloaded and validated assets replace the remote sources.
"""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

folder = Path(__file__).resolve().parent
sources = json.loads((folder / 'originals.json').read_text(encoding='utf-8'))


def download(item):
    name, url = item
    try:
        request = Request(url, headers={'User-Agent': 'PortfolioBrandAssets/1.0'})
        with urlopen(request, timeout=20) as response:
            content = response.read()
        suffix = Path(name).suffix
        if suffix == '.svg':
            root = ET.fromstring(content)
            if root.tag.rsplit('}', 1)[-1] != 'svg':
                raise ValueError('Expected SVG image')
        elif suffix == '.png' and not content.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('Expected PNG image')
        elif suffix == '.ico' and not content.startswith(b'\0\0\x01\0'):
            raise ValueError('Expected ICO image')
        (folder / name).write_bytes(content)
        print(f'Saved {name}')
        return name, url
    except Exception as error:
        # Keep proxy credentials or other network configuration out of logs.
        print(f'Could not download {name}: {type(error).__name__}')
        return None


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        downloaded = list(pool.map(download, sources.items()))
    index = folder.parent.parent / 'index.html'
    html = index.read_text(encoding='utf-8')
    for item in downloaded:
        if item:
            name, url = item
            html = html.replace(f'src="{url}"', f'src="images/stack/{name}"')
    index.write_text(html, encoding='utf-8')
    failed = len(sources) - sum(item is not None for item in downloaded)
    if failed:
        print(f'{failed} assets still use their original remote sources.')
        raise SystemExit(1)
