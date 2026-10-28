"""Verify exported contract, provenance, and strict repository isolation."""
import hashlib,json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((ROOT/'manifest.json').read_text());assets=manifest['assets'];assert len(assets)==96
checks=[]
for a in assets:
    p=ROOT/a['file'];im=Image.open(p);data=np.array(im)
    assert im.mode=='RGBA' and list(im.size)==a['size']
    assert a['size']==([256,352] if a['layer']=='body' else [256,256])
    assert sha(p)==a['sha256'];assert im.getchannel('A').getbbox()==tuple(a['bounds'])
    assert not a['clipped'],a['file']
    assert not np.any(np.concatenate([data[0,:,3],data[-1,:,3],data[:,0,3],data[:,-1,3]])),a['file']
    if a['layer']=='body' and a['mood']=='daylight':
        other=next(v for v in assets if v['id']==a['id'] and v['heightCells']==a['heightCells'] and v['facing']==a['facing'] and v['mood']=='dusk' and v['layer']=='body')
        diff=int(np.count_nonzero(data[:,:,3]!=np.array(Image.open(ROOT/other['file']))[:,:,3]));assert diff==0,(a['file'],diff)
        checks.append({'file':a['file'],'dayEveningAlphaDifferencePixels':diff})
reimports=[]
for identity in ['source-1','source-2']:
    a=np.array(Image.open(ROOT/f'assets/{identity}-1.15-south-daylight-body.png'))
    b=np.array(Image.open(ROOT/f'evidence/{identity}-reimport-daylight.png'))
    alpha=int(np.count_nonzero(a[:,:,3]!=b[:,:,3]));rgb=np.abs(a[:,:,:3].astype(int)-b[:,:,:3].astype(int));mask=(a[:,:,3]>0)&(b[:,:,3]>0)
    assert alpha==0,(identity,alpha)
    reimports.append({'id':identity,'alphaDifferencePixels':alpha,'visibleRgbMeanAbsoluteDifference':float(rgb[mask].mean()),'visibleRgbMaximumDifference':int(rgb[mask].max())})
base='afece64170a46d01c0c4123f4ffd9084d4f671db'
changes=subprocess.check_output(['git','diff','--name-only',base],cwd=REPO,text=True).splitlines()
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=REPO,text=True).splitlines()
assert all(p.startswith('docs/art/meshy-spike/') for p in changes+untracked),changes+untracked
for p in ROOT.rglob('*'):
    if p.is_file():assert p.suffix not in ['.glb','.blend'],p
provenance=json.loads((ROOT/'evidence/comparison-provenance.json').read_text())
for a in provenance['files']:assert sha(ROOT/a['file'])==a['sha256']
authority=['src/game/palletProjection.js','docs/art/batch-01/assets/manifest.json','docs/art/batch-02/manifest.json','docs/visual-integration/source/projection.mjs']
report={'sourceBase':base,'sprites':len(assets),'bodyAlphaPairs':len(checks),'clippedImages':manifest['clipping'],
 'minBodyBorder':min(a['outerTransparentPixels'] for a in assets if a['layer']=='body'),
 'minShadowBorder':min(a['outerTransparentPixels'] for a in assets if a['layer']=='shadow'),
 'marginExceptionsBelow15px':[{'file':a['file'],'border':a['outerTransparentPixels']} for a in assets if a['outerTransparentPixels']<15],
 'cleanImportRenderComparison':reimports,'isolation':'All tracked/untracked changes restricted to docs/art/meshy-spike; no geometry binaries in spike tree.',
 'authorityHashes':{p:sha(REPO/p) for p in authority},'scriptHashes':{p.name:sha(p) for p in sorted((ROOT/'source').iterdir()) if p.is_file()},'bodyAlphaChecks':checks}
(ROOT/'evidence/validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['bodyAlphaChecks','scriptHashes','authorityHashes']},indent=2))
