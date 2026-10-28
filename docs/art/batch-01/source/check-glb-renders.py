"""Measure source/reimport captures; never alter their pixels."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
report = {'status':'PASS','moods':[],'unchangedAcceptedArtifacts':[],
          'acceptedImmutabilityRequested':'--require-accepted' in sys.argv}
for mood in ['daylight','dusk']:
    paths = [ROOT/'evidence'/f'{prefix}-{mood}.png' for prefix in ['glb-source','glb-reimport']]
    source, imported = [np.array(Image.open(p).convert('RGBA')) for p in paths]
    assert source.shape == imported.shape == (352,256,4)
    mask = (source[:,:,3]>0)|(imported[:,:,3]>0)
    silhouette_difference = int(np.count_nonzero((source[:,:,3]>0)!=(imported[:,:,3]>0)))
    assert silhouette_difference <= 16
    difference = np.abs(source[:,:,:3].astype(float)-imported[:,:,:3].astype(float))[mask]
    assert float(difference.mean())<12, 'Unexpected large PBR appearance change; inspect the capture'
    report['moods'].append({'mood':mood,'differentSilhouettePixels':silhouette_difference,
                            'meanRgb8DifferenceOnBody':float(difference.mean()),
                            'p95Rgb8DifferenceOnBody':float(np.percentile(difference,95)),
                            'maxRgb8DifferenceOnBody':float(difference.max()),
                            'files':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]})
# Existing accepted outputs and producer source are immutable during this task.
accepted = '8b2aa6e406adec28ddd21c6cf8caabe6c93ac609'
paths = [ROOT/'source/wall-master.blend',ROOT/'source/render.py']
paths.extend(ROOT/'assets'/a['file'] for a in json.loads((ROOT/'assets/manifest.json').read_text())['assets'])
for p in paths if '--require-accepted' in sys.argv else []:
    relative = str(p.relative_to(REPO))
    old = subprocess.check_output(['git','show',f'{accepted}:{relative}'],cwd=REPO)
    assert old == p.read_bytes(), relative
    report['unchangedAcceptedArtifacts'].append({'file':relative,'sha256':hashlib.sha256(old).hexdigest()})
(ROOT/'evidence/glb-render-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: clean-import/source silhouettes and PBR appearance; requested accepted-artifact checks complete')
