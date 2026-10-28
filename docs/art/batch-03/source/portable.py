"""Reuse the pinned, validated normal-preserving GLB baker on character parts.
Only path/role/identity metadata changes; exporter geometry/PBR algorithms stay.
"""
import ast
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, BASE, IDENTITIES, verify_inputs, sha

verify_inputs()
targets=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['boy','girl']
for character in targets:
    folder=ROOT/'characters'/character
    source=json.loads((folder/'assets/source.json').read_text())
    path=BASE/'source/export-glb.py';tree=ast.parse(path.read_text())
    class Adapt(ast.NodeTransformer):
        def visit_Assign(self,node):
            node=self.generic_visit(node)
            if any(isinstance(t,ast.Name) and t.id=='ROOT' for t in node.targets):
                node.value=ast.Call(func=ast.Name(id='Path',ctx=ast.Load()),args=[ast.Constant(str(folder))],keywords=[])
            if any(ast.unparse(t)=="root['approval']" for t in node.targets):
                node.value=ast.Constant('Issue 57 / character master / owner proportions and appearance pending')
            return node
        def visit_Constant(self,node):
            if not isinstance(node.value,str):return node
            value=node.value.replace('wall-master','character-master')
            value=value.replace('Wall master','Character master').replace('Pallet wall / one cell',IDENTITIES[character])
            value=value.replace('Fort Custer / pallet wall master',IDENTITIES[character]+' / feet root')
            if value=='1 glTF metre = 1 logical cell; source Blender +Z up':value='1 glTF metre = 1 logical cell; source +Z up; pivot at feet'
            return ast.copy_location(ast.Constant(value),node)
        def visit_Compare(self,node):
            node=self.generic_visit(node)
            node.comparators=[ast.Constant('character-master') if isinstance(v,ast.Constant) and v.value=='wall-master' else v for v in node.comparators]
            return node
    tree=Adapt().visit(tree)
    # The literal role string was already renamed by visit_Constant; keep role
    # exactly character-master, matching the independently generated source.
    ast.fix_missing_locations(tree)
    exec(compile(tree,str(path),'exec'),{'__file__':str(path),'__name__':'__main__'})
    exported=folder/'evidence/glb-export.json'
    model=json.loads(exported.read_text())
    model['characterId']=IDENTITIES[character];model['coordinates']['sourceBounds']=source['worldBounds']
    b=source['worldBounds'];model['coordinates']['glTFBounds']=[b[0],b[2],[-b[1][1],-b[1][0]]]
    model['coordinates']['logicalOccupancy']='One logical player cell; height/accessory visual extents are not collision geometry'
    model['provenance']='Original procedural character sculpture informed by five owner-provided 2D concepts; no concept pixels used as textures'
    model['license']='Original geometry/source under repository contribution terms; reference concepts do not establish a separate asset license'
    model['rebuild']=f'blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/portable.py -- {character}'
    exported.write_text(json.dumps(model,indent=2)+'\n')
    print('CHARACTER_GLB_COMPLETE',character,flush=True)
