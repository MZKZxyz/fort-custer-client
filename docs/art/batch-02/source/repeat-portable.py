"""Repeat all three exports and compare GLB/PBR bytes without touching sprites."""
import hashlib
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, run_approved

results=[]
for variant in ['v02','v03','v04']:
    folder=ROOT/'variants'/variant
    files=[folder/'assets'/name for name in ['wall-master.glb','wall-master-basecolor.png','wall-master-normal.png']]
    before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    # The approved exporter record is redirected to this variant's evidence;
    # keep the wrapper's final metadata intact after checking byte identity.
    metadata=(folder/'evidence/glb-export.json').read_bytes()
    run_approved('export-glb.py',variant)
    after={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    assert before==after,(variant,before,after)
    (folder/'evidence/glb-export.json').write_bytes(metadata)
    results.append({'variantId':variant,'byteIdentical':True,'sha256':after})
(ROOT/'evidence/repeat-portable.json').write_text(json.dumps({'status':'PASS','blender':'4.3.2','variants':results,
 'limit':'Same environment repeatability only; no cross-platform PNG/Blender byte-identity guarantee.'},indent=2)+'\n')
print('PASS: three GLBs and six PBR atlases repeat byte-identically')
