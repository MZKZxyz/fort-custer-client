"""Index native captures and validation records without altering any pixels."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
records=[]
for p in sorted((ROOT/'evidence').iterdir()):
    if not p.is_file() or p.name=='index.json':
        continue
    record={'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix=='.png':
        with Image.open(p) as im: record.update(size=list(im.size),mode=im.mode)
    records.append(record)
(ROOT/'evidence/index.json').write_text(json.dumps({'schema':'fort-custer-batch01-evidence-v1','files':records},indent=2)+'\n')
print(f'Indexed {len(records)} evidence files')
