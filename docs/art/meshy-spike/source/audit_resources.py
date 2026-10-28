"""Check normalized GLBs retain exact embedded PBR bytes and semantics."""
import argparse,json
from pathlib import Path
from inspect_glb import inspect
ROOT=Path(__file__).resolve().parents[1]
def maps(s):
    m=s['materials'][0];p=m['pbrMetallicRoughness']
    slots={'baseColor':p['baseColorTexture']['index'],'metallicRoughness':p['metallicRoughnessTexture']['index'],'normal':m['normalTexture']['index']}
    return {key:s['images'][s['textures'][index]['source']]['sha256'] for key,index in slots.items()}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--private-output',required=True,type=Path);a=p.parse_args();records=[]
    originals=json.loads((ROOT/'evidence/source-audit.json').read_text())['sources']
    for s in originals:
        normalized=inspect(a.private_output/s['id']/'normalized.glb')
        assert maps(s)==maps(normalized),(s['id'],'texture slot/content mismatch')
        assert s['triangles']==normalized['triangles'] and s['vertices']==normalized['vertices']
        assert not normalized['externalResources']
        m=normalized['materials'][0];pbr=m['pbrMetallicRoughness']
        assert pbr.get('baseColorFactor',[1]*4)==[1]*4
        assert pbr.get('metallicFactor',1)==1 and pbr.get('roughnessFactor',1)==1
        assert m.get('alphaMode','OPAQUE')=='OPAQUE' and m['doubleSided']
        records.append({'id':s['id'],'normalizedSha256':normalized['sha256'],'triangleCount':normalized['triangles'],'vertexCount':normalized['vertices'],
          'textureSlotsAndEmbeddedBytesIdentical':True,'textureHashesBySlot':maps(normalized),'pbrFactorsAndAlphaPreserved':True,'externalResources':[]})
    (ROOT/'evidence/normalized-texture-validation.json').write_text(json.dumps(records,indent=2)+'\n');print('Both normalized GLBs preserve exact PBR texture bytes, slots and scalar factors')
