"""Artifact checks, body/shadow integrity, clean GLB fidelity and isolation."""
import json
import subprocess
import numpy as np
from PIL import Image
from common import ROOT, REPO, PINS, IDENTITIES, FACINGS, verify_inputs, sha

verify_inputs();m=json.loads((ROOT/'manifest.json').read_text());checks=[];portable=[]
assert {c['characterId'] for c in m['characters']}==set(IDENTITIES.values())
assert m['totals']['bodyImages']==m['totals']['shadowImages']==16
for c in m['characters']:
    character='boy' if c['characterId']==IDENTITIES['boy'] else 'girl'
    folder=ROOT/'characters'/character
    assert sha(ROOT/c['source']['file'])==c['source']['sha256']
    assert len(c['assets'])==16 and len({a['meshSha256'] for a in c['assets']})==1
    for a in c['assets']:
        p=ROOT/a['file'];image=Image.open(p);shadow=a['layer']=='shadow';data=np.array(image);alpha=data[:,:,3]
        assert image.mode=='RGBA' and image.size==((256,256) if shadow else (256,352))
        assert a['anchor']==([128,150] if shadow else [128,208]) and a['cellWidth']==(112 if shadow else 224)
        assert sha(p)==a['sha256'] and list(image.getchannel('A').getbbox())==a['bounds']
        assert a['outerTransparentPixels']>0 and (shadow or a['outerTransparentPixels']>=15)
        assert not alpha[0].any() and not alpha[-1].any() and not alpha[:,0].any() and not alpha[:,-1].any()
        neighbor=np.maximum.reduce([np.roll(alpha,d,axis) for d in [-1,1] for axis in [0,1]])
        edge=(alpha==0)&(neighbor>0);matched=np.zeros(alpha.shape,dtype=bool)
        for dy in [-1,0,1]:
            for dx in [-1,0,1]:
                shifted=np.roll(data,(dy,dx),(0,1));matched|=(shifted[:,:,3]>0)&np.all(data[:,:,:3]==shifted[:,:,:3],axis=2)
        assert np.all(matched[edge]),p
        result={'file':a['file'],'sha256':a['sha256'],'bounds':a['bounds'],'zeroAlphaBorder':a['outerTransparentPixels']}
        if shadow:
            yy,xx=np.indices(alpha.shape);w=alpha.astype(float);center=[float((xx*w).sum()/w.sum()),float((yy*w).sum()/w.sum())]
            assert center[0]>128 and center[1]<150,(p,center);result['shadowCentroid']=center
        checks.append(result)
    for direction in FACINGS:
        day=next(a for a in c['assets'] if a['facing']==direction and a['mood']=='daylight' and a['layer']=='body')
        dusk=next(a for a in c['assets'] if a['facing']==direction and a['mood']=='dusk' and a['layer']=='body')
        assert np.array_equal(np.array(Image.open(ROOT/day['file']))[:,:,3],np.array(Image.open(ROOT/dusk['file']))[:,:,3])
    model=c['model'];assert sha(ROOT/model['file'])==model['sha256']
    for t in model['textures']:assert sha(ROOT/t['file'])==t['sha256']
    qa=json.loads((folder/'evidence/glb-reimport.json').read_text());assert qa['status']=='PASS' and qa['glbSha256']==model['sha256']
    assert qa['cleanImport']['sourceBlendLoaded'] is False and qa['cleanImport']['embeddedPackedImages']==2
    assert qa['maxPositionError']<1e-6 and qa['minimumSourceNormalDot']>.99999
    rendered=[]
    for mood in ['daylight','dusk']:
        a=np.array(Image.open(folder/'evidence'/f'source-check-{mood}.png'))
        b=np.array(Image.open(folder/'evidence'/f'reimport-check-{mood}.png'))
        pixels=int(np.count_nonzero((a[:,:,3]>0)!=(b[:,:,3]>0)));assert pixels<=16,pixels
        difference=np.abs(a[:,:,:3].astype(float)-b[:,:,:3].astype(float))[a[:,:,3]>0];assert difference.mean()<12
        rendered.append({'mood':mood,'differentSilhouettePixels':pixels,'meanRgb8Difference':float(difference.mean()),
                          'p95Rgb8Difference':float(np.percentile(difference,95)),'maxRgb8Difference':float(difference.max())})
    portable.append({'characterId':c['characterId'],'modelSha256':model['sha256'],'maxPositionError':qa['maxPositionError'],
                     'minimumNormalDot':qa['minimumSourceNormalDot'],'triangles':model['triangles'],'materialGroups':len(model['materials']),
                     'sourceImportRenders':rendered})
for p,digest in m['sourceHashes'].items():assert sha(ROOT/p)==digest,p
protected=['docs/art/batch-01','docs/art/batch-02','src','public','package.json','package-lock.json','.github']
subprocess.run(['git','diff','--exit-code',PINS['baseline'],'--',*protected],cwd=REPO,check=True)
report={'status':'PASS','assets':checks,'portableModels':portable,'marginExceptions':m['marginExceptions'],
        'dayEveningAlphaIdenticalPerFacing':True,'protectedUnchangedPaths':protected,'baseline':PINS['baseline'],
        'gate':'Independent Art QA and owner proportion/appearance approval required; no animation or selection authorized',
        'limits':m['limits']}
(ROOT/'evidence/validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 32 RGBA layers, facing/mood anchors, alpha/dilation, 2 clean GLB imports and protected production/art paths')
