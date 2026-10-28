"""Export/clean-import each treatment through the SHA-pinned approved tools."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, run_approved

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['v02','v03','v04']
for variant in args:
    assert variant in ['v02','v03','v04']
    run_approved('export-glb.py',variant)
    p=ROOT/'variants'/variant/'evidence/glb-export.json'
    model=json.loads(p.read_text());model['variantId']=variant
    model['rebuild']=f'blender -b -t 2 --python-exit-code 1 --python docs/art/batch-02/source/portable.py -- {variant}'
    p.write_text(json.dumps(model,indent=2)+'\n')
    run_approved('audit-glb.py',variant)
    print('BATCH02_PORTABLE_QA_COMPLETE',variant,flush=True)
