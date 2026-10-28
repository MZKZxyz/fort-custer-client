import json
from PIL import Image
from common import ROOT, record

files=[]
for folder in [ROOT/'evidence',*(ROOT/'characters'/c/'evidence' for c in ['boy','girl'])]:
    for p in sorted(folder.iterdir()):
        if not p.is_file() or p.name=='index.json':continue
        data=record(p)
        if p.suffix=='.png':
            with Image.open(p) as image:data.update(size=list(image.size),mode=image.mode)
        files.append(data)
(ROOT/'evidence/index.json').write_text(json.dumps({'schema':'fort-custer-batch03-evidence-v1','files':files},indent=2)+'\n')
print('Indexed',len(files),'evidence files')
