"""Validate delivered assets independently of exporter, including real references.
Run from repository root after finish.py. No fixture-generated expected pixels.
"""
import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
m = json.loads((ROOT/'assets/manifest.json').read_text())
results = []
for a in m['assets']:
    path = ROOT/'assets'/a['file']
    im = Image.open(path)
    shadow = a['layer'] == 'shadow'
    assert im.mode == 'RGBA'
    assert list(im.size) == ([256,256] if shadow else [256,352]) == a['size']
    assert a['anchor'] == ([128,150] if shadow else [128,208])
    assert a['cellWidth'] == (112 if shadow else 224)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == a['sha256']
    assert list(im.getchannel('A').getbbox()) == a['bounds']
    data = np.array(im)
    alpha = data[:,:,3]
    for border in [alpha[:15],alpha[-15:],alpha[:,:15],alpha[:,-15:]]:
        assert not np.any(border), a['file']
    # An empty canvas cannot pass the checks.
    assert np.count_nonzero(alpha) > 500
    # Dilation must provide RGB into transparent neighbors of visible edges.
    edge = (alpha == 0) & (np.maximum.reduce([np.roll(alpha,d,axis) for d in [-1,1] for axis in [0,1]]) > 0)
    # Even body undersides can be physically black. Verify the edge RGB is
    # copied from an actual positive-alpha neighbor, rather than assuming
    # nonzero RGB proves dilation (or black proves a matte).
    matched = np.zeros(alpha.shape, dtype=bool)
    for dy in [-1,0,1]:
        for dx in [-1,0,1]:
            neighbor = np.roll(data,(dy,dx),(0,1))
            matched |= (neighbor[:,:,3]>0) & np.all(data[:,:,:3]==neighbor[:,:,:3],axis=2)
    assert np.all(matched[edge]), a['file']
    results.append({'file':a['file'],'mode':im.mode,'bounds':a['bounds'],
                    'zeroAlphaBorder':a['outerTransparentPixels'],'sha256':a['sha256'],
                    'dilatedTransparentEdgePixels':int(edge.sum())})
assert len(results) == 6
assert len(m['models']) == 1
portable = m['models'][0]
assert hashlib.sha256((ROOT/'assets'/portable['file']).read_bytes()).hexdigest() == portable['sha256']
assert hashlib.sha256((ROOT/'source/wall-master.blend').read_bytes()).hexdigest() == portable['sourceBlendSha256']
for texture in portable['textures']:
    assert hashlib.sha256((ROOT/'assets'/texture['file']).read_bytes()).hexdigest() == texture['sha256']
portable_qa = json.loads((ROOT/'evidence/glb-reimport.json').read_text())
assert portable_qa['status'] == 'PASS' and portable_qa['glbSha256'] == portable['sha256']
assert len({a['meshSha256'] for a in m['assets']}) == 1
assert m['projection']['elevation'] == 58 and m['projection']['yaw'] == 0
assert abs(m['projection']['groundPitch']-224*math.sin(math.radians(58))) < 1e-8
assert abs(m['geometry']['height']-.595) < 1e-8
same_alpha = {}
for role in ['wall','ground']:
    a = np.array(Image.open(ROOT/'assets'/f'{role}-daylight-body.png'))[:,:,3]
    b = np.array(Image.open(ROOT/'assets'/f'{role}-dusk-body.png'))[:,:,3]
    difference = np.abs(a.astype(int)-b.astype(int))
    assert np.array_equal(a>0,b>0), role
    same_alpha[role] = {'sameNonzeroMask':True,'maxAlphaDelta':int(difference.max())}
shadow_centroids = {}
for mood in ['daylight','dusk']:
    alpha = np.array(Image.open(ROOT/'assets'/f'wall-{mood}-shadow.png'))[:,:,3].astype(float)
    yy,xx = np.indices(alpha.shape)
    center = [float((xx*alpha).sum()/alpha.sum()),float((yy*alpha).sum()/alpha.sum())]
    assert center[0] > 128 and center[1] < 150, (mood, center)
    shadow_centroids[mood] = {'weightedAlphaCentroid':center,'groundAnchor':[128,150],
                              'direction':'screen upper-right; fixed world +X/+Y key cast direction'}
for name in ['key','fill']:
    assert m['lighting']['daylight'][name]['position'] == m['lighting']['dusk'][name]['position']
for path,sha in m['sourceHashes'].items():
    assert hashlib.sha256((REPO/path).read_bytes()).hexdigest() == sha, path
for path,sha in m['authorityHashes'].items():
    assert hashlib.sha256((REPO/path).read_bytes()).hexdigest() == sha, path
for asset in m['reusedPreviewAssets']:
    assert hashlib.sha256((REPO/asset['file']).read_bytes()).hexdigest() == asset['sha256']
refs = json.loads((ROOT/'references/reference_manifest.json').read_text())
reference_checks = []
for a in refs['reference_assets']:
    actual = hashlib.sha256((ROOT/'references'/a['file']).read_bytes()).hexdigest()
    assert actual == m['referenceHashes'][a['file']]
    reference_checks.append({'file':a['file'],'actualSha256':actual,'suppliedManifestSha256':a['sha256'],
                              'matchesSuppliedManifest':actual==a['sha256']})
package = json.loads((ROOT/'evidence/reference-package.json').read_text())
for a in package['entries']:
    assert hashlib.sha256((ROOT/'references'/a['file']).read_bytes()).hexdigest() == a['zipEntrySha256']
# Prove current production trees are identical to the task baseline, not merely
# that new preview assets weren't imported by a known file.
base = 'ea952aa6b1eafed45143607753210abf23f60867'
protected = ['src','public','package.json','package-lock.json','.github']
subprocess.run(['git','diff','--exit-code',base,'--',*protected],cwd=REPO,check=True)
isolation = {p: subprocess.check_output(['git','rev-parse',f'{base}:{p}'],cwd=REPO,text=True).strip()
             for p in protected}
report = {'status':'PASS','assets':results,'sameMoodSilhouettes':same_alpha,
          'portableModel':{'file':portable['file'],'sha256':portable['sha256'],
                           'cleanReimport':'evidence/glb-reimport.json','status':portable_qa['status']},
          'shadowDirection':shadow_centroids,
          'meshSha256':m['geometry']['meshSha256'],'sourceHashes':m['sourceHashes'],
          'referenceChecks':reference_checks,'referenceZipEntriesVerified':5,
          'warnings':['All five supplied reference-manifest hashes differ from the actual uploaded ZIP entries; original metadata preserved, actual ZIP hashes recorded.'],
          'productionIsolation':{'baseline':base,'protectedGitObjects':isolation},
          'gate':'Owner wall-master approval and independent QA pending; EG-08, EG-09, EG-11 remain open',
          'limits':['Headless captures are not physical-phone perception or performance signoff.',
                    'No Safari/Firefox/device/assistive-technology certification.',
                    'Tipi and explorer/fire/extinguisher are reused preview assets, not new deliverables.']}
(ROOT/'evidence/validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: six exports, alpha/dilation, geometry, reference hashes, lighting, production isolation')
