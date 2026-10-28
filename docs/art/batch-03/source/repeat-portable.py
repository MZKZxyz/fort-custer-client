"""Repeat current PBR exports without rendering or changing any sprite/source."""
import json
import subprocess
from common import ROOT, IDENTITIES, sha

paths=[ROOT/'characters'/c/'assets'/f'character-master{suffix}' for c in IDENTITIES
       for suffix in ['.glb','-basecolor.png','-normal.png']]
before={str(p.relative_to(ROOT)):sha(p) for p in paths}
with open('/tmp/fort-custer-character-repeat.log','w') as log:
    subprocess.run(['blender','-b','-t','2','--python-exit-code','1','--python',str(ROOT/'source/portable.py')],
                   check=True,stdout=log,stderr=subprocess.STDOUT)
after={str(p.relative_to(ROOT)):sha(p) for p in paths};assert before==after,(before,after)
(ROOT/'evidence/repeat-portable.json').write_text(json.dumps({'status':'PASS','blender':'4.3.2','byteIdentical':True,
    'files':after,'limit':'Supported environment repeatability; not cross-platform byte identity.'},indent=2)+'\n')
print('PASS: 2 GLBs and 4 PBR atlases repeat byte-identically')
