"""Re-export once and prove same-platform portable model/atlas byte identity."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
files=['wall-master.glb','wall-master-basecolor.png','wall-master-normal.png']
def hashes():
    return {name:hashlib.sha256((ROOT/'assets'/name).read_bytes()).hexdigest() for name in files}
before=hashes()
with open('/tmp/fort-custer-glb-repeat.log','w') as log:
    subprocess.run(['blender','-b','-t','2','--python-exit-code','1','--python',str(ROOT/'source/export-glb.py')],
                   check=True,stdout=log,stderr=subprocess.STDOUT)
after=hashes()
assert before==after,(before,after)
(ROOT/'evidence/glb-repeat-export.json').write_text(json.dumps({
    'status':'PASS','blender':json.loads((ROOT/'evidence/glb-export.json').read_text())['blender'],
    'samePlatformRepeatExportByteIdentical':True,'sha256':after,
    'limit':'Does not promise byte identity across Blender versions, platforms or PNG encoder changes.'},indent=2)+'\n')
print('PASS: repeat GLB export and both PBR atlases are byte-identical')
