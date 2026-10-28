"""Open each editable source; verify pivots, UVs, identities and fixed cameras."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, WALL, IDENTITIES, FACINGS, geometry_digest, verify_inputs
from render import frame
import bpy
from mathutils import Vector

verify_inputs();results=[]
for character,identity in IDENTITIES.items():
    folder=ROOT/'characters'/character;bpy.ops.wm.open_mainfile(filepath=str(folder/'source/character-master.blend'))
    s=bpy.context.scene;root=bpy.data.objects[identity];metadata=json.loads((folder/'assets/source.json').read_text())
    objects=[o for o in s.objects if o.get('role')=='character-master']
    assert geometry_digest(objects)==metadata['geometrySha256']
    assert list(root.location)==[0,0,0] and list(root.scale)==[1,1,1] and list(root.rotation_euler)==[0,0,0]
    assert not any(o.type=='ARMATURE' for o in s.objects) and not bpy.data.actions
    assert all(o.parent==root and o.type=='MESH' for o in objects)
    assert all(any(mod.type=='TRIANGULATE' for mod in o.modifiers) for o in objects)
    uv_loops=0
    for o in objects:
        assert o.data.uv_layers and o.data.uv_layers.active
        for datum in o.data.uv_layers.active.data:
            assert all(math.isfinite(v) and -1e-6<=v<=1+1e-6 for v in datum.uv)
            uv_loops+=1
    iris=next(m for o in objects for m in o.data.materials if m.name==('Green iris' if character=='boy' else 'Blue iris'))
    color=list(iris.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value)[:3]
    assert color[1]>color[0] and (color[1]>color[2] if character=='boy' else color[2]>color[1])
    assert any(o.name.startswith('Sclera') for o in objects) and any(o.name.startswith('Pupil') for o in objects)
    if character=='girl':assert sum(o.name.startswith('Interwoven blonde braid strand') for o in objects)==3
    frame(s);camera_matrix=[list(row) for row in s.camera.matrix_world]
    origin=Vector((0,0,0));dg=bpy.context.evaluated_depsgraph_get()
    bounds=[]
    from bpy_extras.object_utils import world_to_camera_view
    for facing,angle in FACINGS.items():
        root.rotation_euler.z=math.radians(angle);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
        assert [list(row) for row in s.camera.matrix_world]==camera_matrix
        pixels=[]
        for o in objects:
            for v in o.evaluated_get(dg).data.vertices:
                p=world_to_camera_view(s,s.camera,o.matrix_world@v.co);pixels.append([p.x*256,(1-p.y)*352])
        b=[[min(v[i] for v in pixels),max(v[i] for v in pixels)] for i in [0,1]]
        assert b[0][0]>=15 and b[0][1]<=241 and b[1][0]>=15 and b[1][1]<=337
        bounds.append({'facing':facing,'projectedBounds':b})
    results.append({'characterId':identity,'status':'PASS','components':len(objects),'geometrySha256':metadata['geometrySha256'],
                    'feetRoot':[0,0,0],'scale':[1,1,1],'uvLoops':uv_loops,'irisLinearRGB':color,
                    'separateScleraIrisPupil':True,'fixedCameraMatrix':camera_matrix,'facingFits':bounds,
                    'noSkeletonOrAnimation':True})
assert results[0]['geometrySha256']!=results[1]['geometrySha256']
(ROOT/'evidence/source-audit.json').write_text(json.dumps({'status':'PASS','characters':results},indent=2)+'\n')
print('PASS: two distinct editable sources, centered feet roots, UVs, explicit eyes/hair and all fixed-camera facing fits')
