"""Index screenshots/reports and portable source/import comparisons."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from common import ROOT

records=[]
for folder in [ROOT/'evidence',*(ROOT/'variants'/v/'evidence' for v in ['v02','v03','v04'])]:
    for p in sorted(folder.iterdir()):
        if not p.is_file() or p.name=='index.json':continue
        record={'file':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
        if p.suffix=='.png':
            with Image.open(p) as image:record.update(size=list(image.size),mode=image.mode)
        records.append(record)
(ROOT/'evidence/index.json').write_text(json.dumps({'schema':'fort-custer-batch02-evidence-v1','files':records},indent=2)+'\n')
print(f'Indexed {len(records)} evidence artifacts')
