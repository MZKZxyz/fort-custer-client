"""Extract only modest PR58 evidence from a pinned Git object, never its masters."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[2]
SHA='07ceb812487e9dc3209421b2cd0934896e9358d1'
files=[]
for who in ['boy','girl']:
    for facing in ['south','east','north','west']:
        for mood in ['daylight','dusk']:
            for layer in ['body','shadow']:
                files.append(f'characters/{who}/assets/{who}-{facing}-{mood}-{layer}.png')
    files.append(f'references/{who}_full_body.png')
records=[]
for relative in files:
    src='docs/art/batch-03/'+relative
    data=subprocess.check_output(['git','show',f'{SHA}:{src}'],cwd=REPO)
    target=ROOT/'comparison/pr58'/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    records.append({'file':str(target.relative_to(ROOT)),'sourcePath':src,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(ROOT/'evidence/comparison-provenance.json').write_text(json.dumps({'commit':SHA,'pr':'https://github.com/MZKZxyz/fort-custer-client/pull/58','files':records},indent=2)+'\n')
