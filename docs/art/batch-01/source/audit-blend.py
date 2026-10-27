"""Independent mesh/camera inspection of the delivered .blend; no rerenders."""
import hashlib
import json
import math
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source/wall-master.blend'))
scene=bpy.context.scene
camera=scene.camera
assert camera.data.type=='ORTHO'
assert scene.cycles.samples==32 and not scene.cycles.use_adaptive_sampling
assert scene.render.film_transparent and scene.render.image_settings.color_mode=='RGBA'
walls=[o for o in scene.objects if o.get('role')=='wall-master']
dg=bpy.context.evaluated_depsgraph_get()
points=[o.matrix_world @ Vector(c) for o in walls for c in o.evaluated_get(dg).bound_box]
bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
assert all(abs(bounds[i][0]+.5)<1e-5 and abs(bounds[i][1]-.5)<1e-5 for i in [0,1])
assert abs(bounds[2][1]-.595)<1e-5
direction=camera.rotation_euler.to_matrix() @ Vector((0,0,-1))
assert abs(direction.x)<1e-6
assert abs(math.degrees(math.asin(-direction.z))-58)<1e-4
def pixel(point):
    p=world_to_camera_view(scene,camera,Vector(point))
    return [p.x*256,(1-p.y)*352]
assert max(abs(a-b) for a,b in zip(pixel((0,0,0)),[128,208]))<.001
assert abs(pixel((1,0,0))[0]-pixel((0,0,0))[0]-224)<.001
# Ray through the floor center from the camera-facing direction must see the
# actual recessed floor, not a lid or rear wall: verifies a visibly open well.
dg=bpy.context.evaluated_depsgraph_get()
floor=Vector((0,0,.094))
origin=floor-direction*4
hit,point,normal,index,obj,matrix=scene.ray_cast(dg,origin,direction)
assert hit and obj.name.startswith('Recessed floor plank'),(hit,obj.name if obj else None)
assert abs(point.z-.094)<.001
# A neighboring ray through the front slat must hit wood above the floor.
target=Vector((.25,-.447,.48))
hit2,p2,_,_,o2,_=scene.ray_cast(dg,target-direction*4,direction)
assert hit2 and 'slat' in o2.name and p2.z>.4
report={'status':'PASS','camera':{'elevation':58,'yaw':0,'direction':list(direction),'anchor':pixel((0,0,0)),
                                'orthoScale':camera.data.ortho_scale,'location':list(camera.location)},
        'geometryBounds':bounds,'fixedSamples':scene.cycles.samples,
        'openingRay':{'hit':obj.name,'point':list(point)},'frontSlatRay':{'hit':o2.name,'point':list(p2)},
        'blendSha256':hashlib.sha256((ROOT/'source/wall-master.blend').read_bytes()).hexdigest()}
(ROOT/'evidence/blender.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: delivered .blend camera, anchor, visible well and front slat')
