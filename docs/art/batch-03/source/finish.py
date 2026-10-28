"""Finish only new character sprites; measured borders, no silhouette masking."""
import json
import numpy as np
from PIL import Image
from common import ROOT, REPO, PINS, WALL, IDENTITIES, FACINGS, verify_inputs, record, sha

verify_inputs();characters=[]
for character,identity in IDENTITIES.items():
    folder=ROOT/'characters'/character
    rendered=json.loads((folder/'assets/manifest.json').read_text())
    source=json.loads((folder/'assets/source.json').read_text());source['assets']=rendered['assets']
    for asset in source['assets']:
        p=folder/'assets'/asset['file'];im=Image.open(p);assert im.mode=='RGBA'
        if asset['layer']=='shadow' and im.width==512:
            im=im.resize((256,256),Image.Resampling.LANCZOS);d=np.array(im)
            d[:,:,3]=np.rint(np.maximum(0,(d[:,:,3].astype(float)-32)*255/223)).astype('uint8');im=Image.fromarray(d)
        if asset['layer']=='shadow':asset.update(size=[256,256],anchor=[128,150],cellWidth=112)
        d=np.array(im);alpha=d[:,:,3].copy();valid=alpha>0
        for _ in range(2):
            old,previous=d.copy(),valid.copy()
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
                shifted=np.roll(old,(dy,dx),(0,1));mask=np.roll(previous,(dy,dx),(0,1))&~valid
                if dy==1:mask[0]=False
                if dy==-1:mask[-1]=False
                if dx==1:mask[:,0]=False
                if dx==-1:mask[:,-1]=False
                d[mask,:3]=shifted[mask,:3];valid[mask]=True
        assert np.array_equal(d[:,:,3],alpha)
        im=Image.fromarray(d);b=im.getchannel('A').getbbox();border=min(b[0],b[1],im.width-b[2],im.height-b[3])
        # Preserve the physical soft-cast tail rather than trimming it to fake
        # a 15px border. Issue 57 permits measurable margins where feasible.
        assert border>0 and (asset['layer']=='shadow' or border>=15),(character,asset['file'],b,border)
        im.save(p,optimize=True)
        asset.update(bounds=list(b),outerTransparentPixels=border,sha256=sha(p),bytes=p.stat().st_size,decodedBytes=im.width*im.height*4)
    (folder/'assets/manifest.json').write_text(json.dumps(source,indent=2)+'\n')
    model=json.loads((folder/'evidence/glb-export.json').read_text())
    model['file']=str((folder/'assets'/model['file']).relative_to(ROOT))
    model['textures']=[{**t,'file':str((folder/'assets'/t['file']).relative_to(ROOT))} for t in model['textures']]
    characters.append({**{k:v for k,v in source.items() if k!='assets'},
                       'model':model,'assets':[{**a,'file':str((folder/'assets'/a['file']).relative_to(ROOT))} for a in source['assets']]})
m={'schema':'fort-custer-teen-explorers-v1','issue':57,'baseline':PINS['baseline'],
   'approval':'Proposed masters / independent Art QA and owner proportion/appearance approval pending',
   'blender':'4.3.2','characters':characters,'projection':WALL['projection'],'color':WALL['color'],'lighting':WALL['lighting'],
   'facings':FACINGS,'sourceHashes':{str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'source').glob('*')) if p.is_file()},
   'approvedInputHashes':PINS['files'],'references':'evidence/references.json',
   'license':'Original procedural geometry/source under repository contribution terms; supplied concept images are reference-only, no separate rights claim',
   'processing':'Approved 2:1 shadow downsample, 32/255 catcher alpha-noise remap, two-pixel RGB dilation without alpha changes; no cropping/masking/stretching',
   'limits':['Unrigged neutral posed masters; retopology, rigging, deformation and LODs require a later authorized pass.',
             'Iris hues and freckles are explicit 3D/source/portrait details; individual eye colors are not reliably identifiable at 36px.',
             '1024² 8-bit PBR maps approximate procedural detail and render-engine shading; raw PNG colors are not exact GLB shader parity.',
             'Terrain seams, vertical lantern relighting, physical-device/GPU, assistive technology and ranked camera fairness remain deferred.']}
a=[a for c in characters for a in c['assets']]
m['totals']={'bodyImages':sum(v['layer']=='body' for v in a),'shadowImages':sum(v['layer']=='shadow' for v in a),
             'allSpriteDecodedBytes':sum(v['decodedBytes'] for v in a),
             'allSpritePngBytes':sum(v['bytes'] for v in a),'glbBytes':sum(c['model']['bytes'] for c in characters)}
m['marginExceptions']=[{'file':v['file'],'measuredZeroAlphaBorder':v['outerTransparentPixels'],
                         'reason':'Full soft shadow tail retained at approved canvas/anchor/cell scale; no clipping or artificial alpha trimming'}
                        for v in a if v['outerTransparentPixels']<15]
(ROOT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m['totals']))
