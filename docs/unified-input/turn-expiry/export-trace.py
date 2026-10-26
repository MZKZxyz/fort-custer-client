"""Export one complete native-trial context and its referenced resources.

Usage: python3 export-trace.py GROUP_TRACE.zip PORTABLE_TRACE.zip
All trial measurements remain in native-timing.json; the portable trace shows
context 0 (the first fresh trial), with actions, snapshots and media unchanged.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

source, target = map(Path, sys.argv[1:])
with zipfile.ZipFile(source) as archive:
    names = archive.namelist()
    selected = {n for n in names if n.startswith('0-trace.')}
    if '0-trace.trace' not in selected:
        raise ValueError('Expected the first complete browser context')
    resources = {n: n.removeprefix('resources/').encode() for n in names if n.startswith('resources/')}
    pending = list(selected)
    while pending:
        content = archive.read(pending.pop())
        for name, reference in resources.items():
            if name not in selected and reference in content:
                selected.add(name)
                pending.append(name)
    with tempfile.TemporaryDirectory(prefix='fc-native-trace-') as temporary:
        subset = Path(temporary) / 'first-context.zip'
        with zipfile.ZipFile(subset, 'w', compression=zipfile.ZIP_DEFLATED) as output:
            for name in names:
                if name in selected:
                    output.writestr(name, archive.read(name))
        sanitizer = Path(__file__).resolve().parent.parent / 'surface-revision/sanitize-traces.py'
        subprocess.run([sys.executable, str(sanitizer), str(subset), str(target)], check=True)
