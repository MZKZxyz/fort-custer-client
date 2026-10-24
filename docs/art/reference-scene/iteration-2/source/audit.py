"""Run with Blender on /tmp/fort-custer-iteration-2.blend after authoring.
Reports actual mesh projections and ray intersections, not an independent QA signoff.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.context.scene;camera=scene.camera
roles={
 'S':{'cell':[9,2],'prefixes':['Separated boot','Indigo coat','Backpack','Outward sleeve','Clay hand','Visible face','Nose','Neckerchief','Hat brim','Hat crown'],'points':{'coat':(0,-.26,.48),'face':(0,-.30,.87),'left_boot':(-.145,-.18,.14),'right_boot':(.145,-.18,.14)}},
 'X':{'cell':[7,2],'prefixes':['Extinguisher body','Rounded shoulder','Cream body label','Broad squeeze lever','Lever neck','Looped hose','Flared nozzle'],'points':{'body':(-.1,-.015,.43),'lever':(0,.18,.79),'nozzle':(.23,-.20,.35)}},
 'F':{'cell':[5,4],'prefixes':['Charred log','Raised orange tongue','Pointed golden core'],'points':{'left_tip':(-.185,.130,.71),'central_tip':(.045,.190,1.01),'golden_core':(0,-.13,.48)}},
 'E':{'cell':[1,7],'prefixes':['Provisional canvas goal','Canvas entrance sides','Dark entry mat','Ridge pole','Front frame'],'points':{'entrance':(0,-.34,.30),'ridge':(0,0,1.06)}}}
report={'kind':'author geometry/raycast diagnostic; not human perception approval','angles':{}}
for elevation in [70.1,58.0]:
 a=math.radians(elevation);camera.location=(0,-25*math.cos(a),25*math.sin(a));camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get();angle={}
 for token,role in roles.items():
  r,c=role['cell'];x,y=c-4,5-r
  objects=[o for o in scene.objects if any(o.name.startswith(p) for p in role['prefixes'])]
  corners=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
  assert all(x-.501<=v.x<=x+.501 and y-.501<=v.y<=y+.501 for v in corners),(token,'footprint escape')
  projected=[world_to_camera_view(scene,camera,v) for v in corners]
  bounds=[min(v.x for v in projected)*1400,min(1-v.y for v in projected)*1400,max(v.x for v in projected)*1400,max(1-v.y for v in projected)*1400]
  hits={}
  for name,offset in role['points'].items():
   point=Vector((x+offset[0],y+offset[1],offset[2]))
   # Orthographic rays must be parallel, not aimed from the camera's center.
   forward=camera.rotation_euler.to_matrix()@Vector((0,0,-1));origin=point-forward*50
   hit,loc,normal,face,obj,matrix=scene.ray_cast(deps,origin,forward,distance=50.03)
   wall=bool(hit and obj.name.startswith(('Horizontal pallet','Corner upright','Blocked continuous','Iron peg')))
   hits[name]={'first_hit':obj.name if hit else None,'wall_occluded':wall,'hit_distance':(loc-origin).length if hit else None}
  angle[token]={'cell':role['cell'],'mesh_count':len(objects),'pixel_bounds_1400':bounds,'height':max(v.z for v in corners),'within_logical_cell_xy':True,'sample_rays':hits}
 report['angles'][str(elevation)]=angle
(ROOT/'previews/geometry-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
