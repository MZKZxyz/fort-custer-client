"""Finish clean Blender exports; repeatable without rerendering.
Uniformly downsample shadows, remove catcher noise, dilate RGB only. Never trim
the alpha to make a border assertion pass. All images retain world anchors.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
manifest_path = ROOT / 'assets/manifest.json'
manifest = json.loads(manifest_path.read_text())
for asset in manifest['assets']:
    path = ROOT / 'assets' / asset['file']
    image = Image.open(path)
    assert image.mode == 'RGBA'
    if asset['layer'] == 'shadow' and image.width == 512:
        image = image.resize((256, 256), Image.Resampling.LANCZOS)
        data = np.array(image)
        data[:, :, 3] = np.rint(np.maximum(0, (data[:, :, 3].astype(float)-32)*255/223)).astype('uint8')
        image = Image.fromarray(data)
    if asset['layer'] == 'shadow':
        asset.update(size=[256, 256], anchor=[128, 150], cellWidth=112)
    data = np.array(image)
    alpha = data[:, :, 3].copy()
    valid = alpha > 0
    for _ in range(2):
        old, previous = data.copy(), valid.copy()
        for dy, dx in [(0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]:
            shifted = np.roll(old, (dy, dx), (0, 1))
            mask = np.roll(previous, (dy, dx), (0, 1)) & ~valid
            if dy == 1: mask[0] = False
            if dy == -1: mask[-1] = False
            if dx == 1: mask[:, 0] = False
            if dx == -1: mask[:, -1] = False
            data[mask, :3] = shifted[mask, :3]
            valid[mask] = True
    assert np.array_equal(data[:, :, 3], alpha)
    image = Image.fromarray(data)
    bounds = image.getchannel('A').getbbox()
    border = min(bounds[0], bounds[1], image.width-bounds[2], image.height-bounds[3])
    assert border >= 15, (asset['file'], bounds, border)
    image.save(path, optimize=True)
    asset.update(bounds=list(bounds), outerTransparentPixels=border,
                 bytes=path.stat().st_size, decodedBytes=image.width*image.height*4,
                 sha256=hashlib.sha256(path.read_bytes()).hexdigest())
manifest['processing'] = 'Shadow 512²/224 px per cell → 256²/112; catcher alpha remap max(0,(a−32)*255/223). Two-pixel RGB-only dilation; alpha unchanged; no border cutting.'
manifest['sourceHashes'] = {str(p.relative_to(REPO)): hashlib.sha256(p.read_bytes()).hexdigest()
                            for p in sorted((ROOT / 'source').glob('*')) if p.suffix in ['.py','.mjs','.cjs','.blend']}
authority = ['docs/art/reference-scene/iteration-2/source/render.py',
             'docs/visual-integration/assets/manifest.json',
             'docs/visual-integration/source/projection.mjs',
             'src/game/palletProjection.js', 'src/game/camera.js',
             'src/components/PalletMaze.js', 'src/css/PalletMaze.css']
manifest['authorityHashes'] = {p: hashlib.sha256((REPO/p).read_bytes()).hexdigest() for p in authority}
reused = [REPO/'docs/visual-integration/assets'/f'{role}-{mood}-{layer}.png'
          for role in ['explorer-down','extinguisher','fire']
          for mood in ['daylight','dusk'] for layer in ['body','shadow']]
reused.append(REPO/'public/images/teepee_01.png')
manifest['reusedPreviewAssets'] = [{'file': str(p.relative_to(REPO)),
                                  'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                                  'size': list(Image.open(p).size),
                                  'bytes': p.stat().st_size} for p in reused]
manifest['referenceHashes'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in sorted((ROOT / 'references').glob('*')) if p.is_file()}
manifest['totals'] = {'images': len(manifest['assets']),
                       'decodedBytes': sum(a['decodedBytes'] for a in manifest['assets']),
                       'transferBytes': sum(a['bytes'] for a in manifest['assets'])}
portable_record = ROOT / 'evidence/glb-export.json'
if portable_record.exists():
    model = json.loads(portable_record.read_text())
    assert hashlib.sha256((ROOT/'assets'/model['file']).read_bytes()).hexdigest() == model['sha256']
    manifest['models'] = [model]
    manifest['modelTotals'] = {'models':1, 'embeddedTextureImages':len(model['textures']),
                               'glbBytes':model['bytes'], 'separateTextureFilesForAudit':True}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest['totals']))
