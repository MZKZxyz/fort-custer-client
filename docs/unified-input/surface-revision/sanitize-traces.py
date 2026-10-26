"""Make Playwright source references repository-relative without changing actions.

Usage: python3 docs/unified-input/surface-revision/sanitize-traces.py INPUT OUTPUT
The output remains a standard Playwright trace archive. No media is edited.
"""
from pathlib import Path
import hashlib
import re
import sys
import zipfile

repo = Path(__file__).resolve().parents[3].as_posix()
source, target = map(Path, sys.argv[1:])
entries = []
renames = {}
with zipfile.ZipFile(source) as archive:
    for info in archive.infolist():
        content = archive.read(info.filename)
        if info.filename.endswith(('.trace', '.network', '.stacks', '.txt', '.json')):
            decoded = content.decode('utf-8')
            for original in re.findall(re.escape(repo) + r'/[^"\n\\]*', decoded):
                relative = original[len(repo) + 1:]
                old_key = hashlib.sha1(original.encode()).hexdigest()
                new_key = hashlib.sha1(relative.encode()).hexdigest()
                renames[f'resources/src@{old_key}.txt'] = f'resources/src@{new_key}.txt'
            decoded = decoded.replace('file://' + repo + '/', '').replace(repo + '/', '').replace(repo, '.')
            if re.search(r'/(?:workspace|Users|home)/', decoded):
                raise ValueError('Unexpected absolute source reference; inspect locally before publishing.')
            content = decoded.encode('utf-8')
        entries.append((info, content))
target.parent.mkdir(parents=True, exist_ok=True)
temporary = target.with_suffix('.tmp.zip')
with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for info, content in entries:
        info.filename = renames.get(info.filename, info.filename)
        archive.writestr(info, content)
temporary.replace(target)
print(f'Wrote portable trace: {target.name}')
