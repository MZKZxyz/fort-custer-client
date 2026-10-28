"""Finalize RGBA exports and measure clipping, without trimming silhouettes."""
import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

def finish(path,shadow):
    image=Image.open(path).convert('RGBA')
    if shadow and image.width==512:
        image=image.resize((256,256),Image.Resampling.LANCZOS)
        data=np.array(image);data[:,:,3]=np.rint(np.maximum(0,(data[:,:,3].astype(float)-32)*255/223)).astype('uint8');image=Image.fromarray(data)
    data=np.array(image);alpha=data[:,:,3].copy();valid=alpha>0
    for _ in range(2):
        old,previous=data.copy(),valid.copy()
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
            shifted=np.roll(old,(dy,dx),(0,1));mask=np.roll(previous,(dy,dx),(0,1))&~valid
            if dy==1:mask[0]=False
            if dy==-1:mask[-1]=False
            if dx==1:mask[:,0]=False
            if dx==-1:mask[:,-1]=False
            data[mask,:3]=shifted[mask,:3];valid[mask]=True
    assert np.array_equal(alpha,data[:,:,3]);image=Image.fromarray(data);image.save(path,optimize=True)
    b=image.getchannel('A').getbbox();border=min(b[0],b[1],image.width-b[2],image.height-b[3]) if b else None
    return {'size':list(image.size),'bounds':b,'outerTransparentPixels':border,'clipped':border==0,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'decodedBytes':image.width*image.height*4}

if __name__=='__main__':
    sources=[];assets=[]
    for p in sorted((ROOT/'evidence').glob('source-*-sprites.json')):
        record=json.loads(p.read_text());sprites=record.pop('sprites');sources.append(record)
        for a in sprites:
            shadow=a['layer']=='shadow';a.update(finish(ROOT/a['file'],shadow));a.update(anchor=[128,150] if shadow else [128,208],cellWidth=112 if shadow else 224);assets.append(a)
    manifest={'schema':'fc-meshy-sprites-v1','approval':'visual evaluation only; owner and independent QA pending',
      'camera':{'elevation':58,'yaw':0,'authoringPixelsPerCell':224,'facings':{'south':0,'east':90,'north':180,'west':-90}},
      'lightingAuthority':'../batch-01/assets/manifest.json','sources':sources,'assets':assets,
      'processing':'Cycles CPU 32 samples seed 30; AgX Medium High Contrast. Straight RGBA8. Shadows 512²→256², 112px/cell; max(0,(alpha−32)*255/223). Two-pixel RGB dilation only.',
      'totals':{'images':len(assets),'transferBytes':sum(a['bytes'] for a in assets),'decodedBytes':sum(a['decodedBytes'] for a in assets)},
      'clipping':[a['file'] for a in assets if a['clipped']]}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['totals']),manifest['clipping'])
