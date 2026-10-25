"""Finalize exported PNGs: uniform shadow downsample, noise floor, RGB dilation.
Run once after each clean export; idempotent for already finalized images.
"""
import json,hashlib
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'assets/manifest.json'; manifest=json.loads(path.read_text())
for asset in manifest['assets']:
    file=ROOT/'assets'/asset['file']; image=Image.open(file).convert('RGBA')
    if asset['layer']=='shadow' and image.width==512:
        image=image.resize((256,256),Image.Resampling.LANCZOS)
        pixels=np.array(image)
        # Cycles catcher returns Monte Carlo residuals in fully lit areas.
        # Drop < 32/255 alpha, then smoothly remap that floor to zero.
        a=pixels[:,:,3].astype(float)
        pixels[:,:,3]=np.rint(np.maximum(0,(a-32)*255/223)).astype('uint8')
        image=Image.fromarray(pixels)
    if asset['layer']=='shadow': asset.update(size=[256,256],anchor=[128,150],cellWidth=112)
    data=np.array(image); alpha=data[:,:,3].copy()
    valid=alpha>0
    # Two iterations copy nearest valid RGB into zero-alpha neighbors, preserving
    # alpha exactly. This prevents black matte interpolation at fractional scales.
    for iteration in range(2):
        old=data.copy(); previous=valid.copy()
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
            shifted=np.roll(old,(dy,dx),(0,1)); mask=np.roll(previous,(dy,dx),(0,1)) & ~valid
            if dy==1:mask[0]=False
            if dy==-1:mask[-1]=False
            if dx==1:mask[:,0]=False
            if dx==-1:mask[:,-1]=False
            data[mask,:3]=shifted[mask,:3];valid[mask]=True
    data[:,:,3]=alpha
    image=Image.fromarray(data);image.save(file,optimize=True)
    bounds=image.getchannel('A').getbbox()
    asset.update(bounds=list(bounds) if bounds else None,bytes=file.stat().st_size,
      decodedBytes=image.width*image.height*4,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
      outerTransparentPixels=min(bounds[0],bounds[1],image.width-bounds[2],image.height-bounds[3]) if bounds else 0)
    assert asset['outerTransparentPixels']>=4, (file.name,bounds)
manifest['processing']='Shadows rendered 512² at 224px/cell then uniformly downsampled 2:1; alpha floor 32/255 remapped to zero. All PNG RGB dilated 2px into zero alpha without changing alpha.'
manifest['totals']={'images':len(manifest['assets']),'decodedBytes':sum(a['decodedBytes'] for a in manifest['assets']),
 'transferByMood':{m:sum(a['bytes'] for a in manifest['assets'] if a['mood']==m) for m in ['daylight','dusk']}}
manifest['sourceHashes']={str(p.relative_to(ROOT.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'source/export.py',ROOT/'source/finish.py',ROOT.parent/'art/reference-scene/iteration-2/source/render.py']}
path.write_text(json.dumps(manifest,indent=2)+'\n'); print(json.dumps(manifest['totals'],indent=2))
