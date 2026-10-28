"""Reopen saved variant sources and compare geometry/rig to the approved file."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, BASE, APPROVED, geometry_hash, verify_inputs
import bpy
from mathutils import Vector

verify_inputs()
def measure():
    s=bpy.context.scene;walls=[o for o in s.objects if o.get('role')=='wall-master']
    dg=bpy.context.evaluated_depsgraph_get()
    points=[o.matrix_world@Vector(c) for o in walls for c in o.evaluated_get(dg).bound_box]
    bg=s.world.node_tree.nodes.get('Background')
    return {'geometrySha256':geometry_hash(walls),'objects':len(walls),
            'bounds':[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)],
            'cameraMatrix':[list(row) for row in s.camera.matrix_world],
            'orthoScale':s.camera.data.ortho_scale,'resolution':[s.render.resolution_x,s.render.resolution_y],
            'cameraType':s.camera.data.type,'samples':s.cycles.samples,'seed':s.cycles.seed,
            'viewTransform':s.view_settings.view_transform,'look':s.view_settings.look,
            'worldBackground':list(bg.inputs['Color'].default_value),
            'worldStrength':bg.inputs['Strength'].default_value,
            'lights':{o.name:{'location':list(o.location),'rotation':list(o.rotation_euler),
                              'energy':o.data.energy,'color':list(o.data.color),'size':o.data.size}
                      for o in s.objects if o.type=='LIGHT'}}
bpy.ops.wm.open_mainfile(filepath=str(BASE/'source/wall-master.blend'))
expected=measure();assert expected['geometrySha256']==APPROVED['geometry']['meshSha256']
results=[]
for variant in ['v02','v03','v04']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'variants'/variant/'source/wall-master.blend'))
    actual=measure();assert actual==expected,(variant,actual,expected)
    assert bpy.context.scene.get('variantId')==variant
    dg=bpy.context.evaluated_depsgraph_get()
    hit,point,normal,*_=bpy.context.scene.ray_cast(dg,Vector((0,0,2)),Vector((0,0,-1)))
    assert hit and abs(point.z-.094)<1e-5 and normal.z>.99
    results.append({'variantId':variant,'status':'PASS',**actual,'openWellHit':list(point)})
(ROOT/'evidence/source-audit.json').write_text(json.dumps({'status':'PASS','variants':results},indent=2)+'\n')
print('PASS: three saved sources have identical approved geometry/camera/light/world rig and visible open well')
