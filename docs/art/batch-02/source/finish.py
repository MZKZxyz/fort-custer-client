"""Finalize only new sprites and write one four-treatment manifest."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from common import ROOT, REPO, BASE, PINS, APPROVED, NAMES, verify_inputs, record_file, glb_geometry_signature

verify_inputs()
variants=[]
original={k:APPROVED[k] for k in ['geometry','projection','color','lighting']}
original.update(id='v01',name=NAMES['v01'],approval='owner-approved Batch 01 / retained unchanged',
                sourceBlend={'file':'../batch-01/source/wall-master.blend','sha256':PINS['files']['docs/art/batch-01/source/wall-master.blend']},
                model=APPROVED['models'][0].copy(),assets=[])
original['model']['file']='../batch-01/assets/wall-master.glb'
for a in APPROVED['assets']:
    if a['role']=='wall': original['assets'].append({**a,'file':'../batch-01/assets/'+a['file']})
original['model']['textures']=[{**t,'file':'../batch-01/assets/'+t['file']} for t in APPROVED['models'][0]['textures']]
variants.append(original)
shared_portable=glb_geometry_signature(BASE/'assets/wall-master.glb')
original['model']['geometryPayloadSha256']=shared_portable
for variant in ['v02','v03','v04']:
    folder=ROOT/'variants'/variant
    metadata=json.loads((folder/'assets/manifest.json').read_text())
    for asset in metadata['assets']:
        path=folder/'assets'/asset['file'];image=Image.open(path)
        assert image.mode=='RGBA'
        if asset['layer']=='shadow' and image.width==512:
            image=image.resize((256,256),Image.Resampling.LANCZOS)
            pixels=np.array(image)
            pixels[:,:,3]=np.rint(np.maximum(0,(pixels[:,:,3].astype(float)-32)*255/223)).astype('uint8')
            image=Image.fromarray(pixels)
        if asset['layer']=='shadow': asset.update(size=[256,256],anchor=[128,150],cellWidth=112)
        data=np.array(image);alpha=data[:,:,3].copy();valid=alpha>0
        for _ in range(2):
            old,previous=data.copy(),valid.copy()
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
                shifted=np.roll(old,(dy,dx),(0,1));mask=np.roll(previous,(dy,dx),(0,1)) & ~valid
                if dy==1:mask[0]=False
                if dy==-1:mask[-1]=False
                if dx==1:mask[:,0]=False
                if dx==-1:mask[:,-1]=False
                data[mask,:3]=shifted[mask,:3];valid[mask]=True
        assert np.array_equal(data[:,:,3],alpha)
        image=Image.fromarray(data);bounds=image.getchannel('A').getbbox()
        border=min(bounds[0],bounds[1],image.width-bounds[2],image.height-bounds[3]);assert border>=15,(variant,asset,bounds)
        image.save(path,optimize=True)
        asset.update(bounds=list(bounds),outerTransparentPixels=border,bytes=path.stat().st_size,
                     decodedBytes=image.width*image.height*4,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    metadata['processing']='Approved 2:1 shadow downsample and 32/255 catcher noise remap; two-pixel RGB-only dilation; no alpha trimming.'
    (folder/'assets/manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
    model=json.loads((folder/'evidence/glb-export.json').read_text())
    model['geometryPayloadSha256']=glb_geometry_signature(folder/'assets'/model['file'])
    assert model['geometryPayloadSha256']==shared_portable
    model['file']=str((folder/'assets'/model['file']).relative_to(ROOT))
    model['textures']=[{**t,'file':str((folder/'assets'/t['file']).relative_to(ROOT))} for t in model['textures']]
    variants.append({'id':variant,'name':NAMES[variant],
                     **{k:metadata[k] for k in ['approval','geometry','projection','color','lighting','materials']},
                     'sourceBlend':record_file(folder/'source/wall-master.blend'),'model':model,
                     'assets':[{**a,'file':str((folder/'assets'/a['file']).relative_to(ROOT))} for a in metadata['assets']]})
manifest={'schema':'fort-custer-weathering-v1','issue':55,'baseline':PINS['baseline'],
          'approval':'v01 approved; v02-v04 proposed / independent QA and owner visual approval pending',
          'blender':'4.3.2','seed':30,'variants':variants,
          'selector':'fc-wall-fnv1a32-v1; preview-only UTF-8 FNV-1a of JSON [mazeSeed,row,column], 0x7feb352d/0x846ca68b avalanche, modulo four',
          'sharedGeometrySha256':APPROVED['geometry']['meshSha256'],
          'sharedPortableGeometrySha256':shared_portable,
          'portableGeometryHashMethod':'Ordered POSITION/NORMAL/TANGENT/TEXCOORD/index accessor metadata and packed bytes; excludes materials/images',
          'upstreamHashes':PINS['files'],
          'sourceHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'source').glob('*')) if p.is_file()},
          'license':APPROVED['license'],'provenance':'Material-only derivatives of owner-approved Batch 01; no concept pixels used as textures',
          'limits':['No production runtime imports, flags, gameplay or data changes.',
                    'GLBs preserve the 11,824-triangle/13-material archival geometry, not a phone-certified LOD.',
                    '1024² PBR maps approximate procedural grain; finite atlas/filtering/shader losses remain.',
                    'Ground seams, vertical lantern relighting, physical-device/GPU/accessibility and ranked camera fairness remain deferred.']}
assets=[a for v in variants for a in v['assets']]
manifest['totals']={'treatments':4,'newTreatments':3,'newSpriteImages':12,
                    'activeMoodWallRgbaBytes':sum(a['decodedBytes'] for a in assets if a['mood']=='daylight'),
                    'allMoodWallRgbaBytes':sum(a['decodedBytes'] for a in assets),
                    'spritePngBytesByMood':{m:sum(a['bytes'] for a in assets if a['mood']==m) for m in ['daylight','dusk']},
                    'glbBytes':sum(v['model']['bytes'] for v in variants)}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['totals']))
