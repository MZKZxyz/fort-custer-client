import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
BASE=ROOT.parent/'batch-01'
PINS=json.loads((ROOT/'source/approved-inputs.json').read_text())
WALL=json.loads((BASE/'assets/manifest.json').read_text())
IDENTITIES={'boy':'CHR-BOY-01','girl':'CHR-GIRL-01'}
FACINGS={'south':0,'east':90,'north':180,'west':-90}

def verify_inputs():
    for p,sha in PINS['files'].items():assert hashlib.sha256((REPO/p).read_bytes()).hexdigest()==sha,p

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def record(path):return {'file':str(path.relative_to(ROOT)),'sha256':sha(path),'bytes':path.stat().st_size}

def geometry_digest(objects):
    data=[(o.name,[list(row) for row in o.matrix_local],
           [list(v.co) for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons])
          for o in sorted(objects,key=lambda o:o.name)]
    return hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()
