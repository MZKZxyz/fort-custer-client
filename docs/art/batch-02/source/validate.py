"""Native asset, portable reimport, v01 preservation and production isolation."""
import hashlib
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from common import ROOT, REPO, BASE, PINS, APPROVED, verify_inputs, glb_geometry_signature

verify_inputs()
m=json.loads((ROOT/'manifest.json').read_text())
assert [v['id'] for v in m['variants']]==['v01','v02','v03','v04']
baseline_arrays={mood:np.array(Image.open(BASE/'assets'/f'wall-{mood}-body.png')) for mood in ['daylight','dusk']}
checks=[]
portable_checks=[]
for v in m['variants']:
    assert v['geometry']==APPROVED['geometry'] and v['projection']==APPROVED['projection']
    assert v['lighting']==APPROVED['lighting'] and v['color']==APPROVED['color']
    for a in v['assets']:
        p=ROOT/a['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
        image=Image.open(p);shadow=a['layer']=='shadow';alpha=np.array(image)[:,:,3]
        assert image.mode=='RGBA' and image.size==((256,256) if shadow else (256,352))
        assert a['anchor']==([128,150] if shadow else [128,208])
        assert a['cellWidth']==(112 if shadow else 224)
        assert list(image.getchannel('A').getbbox())==a['bounds']
        for edge in [alpha[:15],alpha[-15:],alpha[:,:15],alpha[:,-15:]]:assert not edge.any()
        pixels=np.array(image);neighbor=np.maximum.reduce([np.roll(alpha,d,axis) for d in [-1,1] for axis in [0,1]])
        edges=(alpha==0)&(neighbor>0);matched=np.zeros(alpha.shape,dtype=bool)
        for dy in [-1,0,1]:
            for dx in [-1,0,1]:
                shifted=np.roll(pixels,(dy,dx),(0,1))
                matched|=(shifted[:,:,3]>0)&np.all(pixels[:,:,:3]==shifted[:,:,:3],axis=2)
        assert np.all(matched[edges]),(v['id'],a['file'])
        result={'file':a['file'],'sha256':a['sha256'],'border':a['outerTransparentPixels']}
        if not shadow:
            original=baseline_arrays[a['mood']]
            assert np.array_equal(alpha,original[:,:,3]),a['file']
            result['alphaIdenticalToApproved']=True
            visible=alpha>32
            difference=np.abs(pixels[:,:,:3].astype(float)-original[:,:,:3].astype(float))[visible]
            result['meanRgbDifferenceFromHoney']=float(difference.mean())
            result['visibleMeanRgb8']=[float(x) for x in pixels[:,:,:3][visible].mean(axis=0)]
        else:
            yy,xx=np.indices(alpha.shape);weights=alpha.astype(float)
            center=[float((xx*weights).sum()/weights.sum()),float((yy*weights).sum()/weights.sum())]
            assert center[0]>128 and center[1]<150
            result['shadowCentroid']=center
        checks.append(result)
    model=v['model'];assert hashlib.sha256((ROOT/model['file']).read_bytes()).hexdigest()==model['sha256']
    assert glb_geometry_signature(ROOT/model['file'])==model['geometryPayloadSha256']==m['sharedPortableGeometrySha256']
    for texture in model['textures']:
        assert hashlib.sha256((ROOT/texture['file']).read_bytes()).hexdigest()==texture['sha256']
    if v['id']!='v01':
        assert model['triangles']==11824 and len(model['materials'])==13
        assert hashlib.sha256((ROOT/v['sourceBlend']['file']).read_bytes()).hexdigest()==v['sourceBlend']['sha256']
        qa=json.loads((ROOT/'variants'/v['id']/'evidence/glb-reimport.json').read_text())
        assert qa['status']=='PASS' and qa['glbSha256']==model['sha256']
        assert qa['maxPositionError']<1e-6 and qa['minimumSourceNormalDot']>.99999
        assert qa['importStateBeforeLookdev']['sourceBlendLoadedDuringImport'] is False
        rendered=[]
        for mood in ['daylight','dusk']:
            s=np.array(Image.open(ROOT/'variants'/v['id']/'evidence'/f'glb-source-{mood}.png'))
            r=np.array(Image.open(ROOT/'variants'/v['id']/'evidence'/f'glb-reimport-{mood}.png'))
            assert np.array_equal(s[:,:,3]>0,r[:,:,3]>0)
            difference=np.abs(s[:,:,:3].astype(float)-r[:,:,:3].astype(float))[s[:,:,3]>0]
            assert difference.mean()<12
            rendered.append({'mood':mood,'differentSilhouettePixels':0,'meanRgb8Difference':float(difference.mean()),
                             'p95Rgb8Difference':float(np.percentile(difference,95)),
                             'maxRgb8Difference':float(difference.max())})
        portable_checks.append({'variantId':v['id'],'glbSha256':model['sha256'],
                                 'maxPositionError':qa['maxPositionError'],'minimumNormalDot':qa['minimumSourceNormalDot'],
                                 'sourceImportRenders':rendered})
for p,sha in m['sourceHashes'].items():
    assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==sha,p
assert json.loads((ROOT/'evidence/source-audit.json').read_text())['status']=='PASS'
protected=['docs/art/batch-01','src','public','package.json','package-lock.json','.github']
subprocess.run(['git','diff','--exit-code',PINS['baseline'],'--',*protected],cwd=REPO,check=True)
report={'status':'PASS','baseline':PINS['baseline'],'assets':checks,
        'sharedPortableGeometrySha256':m['sharedPortableGeometrySha256'],
        'portableModels':portable_checks,
        'savedSources':'source-audit.json','v01AndProductionPathsUnchanged':protected,
        'approvedInputHashes':PINS['files'],
        'limits':['Author QA only; new finishes need independent Art QA and owner visual approval.',
                  'No device/GPU, Safari/Firefox, assistive-technology or runtime-LOD certification.']}
(ROOT/'evidence/validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 16 wall layers, three clean GLB imports, identical approved alpha/geometry/rig, v01 and production isolation')
