"""Bounded VIS-04A kit. Run from repo root: blender -b -t 2 --python <this file>.
Reuses the approved procedural construction without running its full scene renders.
No copied/rotated bitmaps; each explorer heading is independently lit and rendered.
"""
import ast
import bpy
import math
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'art/reference-scene/iteration-2/source/render.py'
text = SOURCE.read_text()
namespace = {'__file__': str(SOURCE)}
# Definitions/materials are evaluated verbatim. Skip the source fixture write and
# scene construction. The four cell builders below retain their original AST.
tree = ast.parse(text.split('# Edge ecology only.')[0])
cell_loop = next(n for n in tree.body if isinstance(n, ast.For) and ast.unparse(n.target) == '(r, row)')
explorer_start = next(i for i,n in enumerate(tree.body) if isinstance(n, ast.Assign) and ast.unparse(n.targets[0]) == '(x, y)' and 'xy(9, 2)' in ast.unparse(n.value))
definitions = [n for n in tree.body[:tree.body.index(cell_loop)]
               if not (isinstance(n, ast.Expr) and ('write_text' in ast.unparse(n) or ast.unparse(n).startswith('box(')))]
exec(compile(ast.Module(body=definitions, type_ignores=[]), str(SOURCE), 'exec'), namespace)
namespace['xy'] = lambda r,c: (0,0)
groups = {}
for name, token in [('wall','#'),('extinguisher','X'),('fire','F'),('exit','E')]:
    before = set(bpy.data.objects)
    namespace['GRID'] = [token]
    exec(compile(ast.Module(body=[cell_loop], type_ignores=[]), str(SOURCE), 'exec'), namespace)
    groups[name] = list(set(bpy.data.objects)-before)
    # Walkable ground is its own layer, never baked into props.
    if token != '#':
        for obj in list(groups[name]):
            if obj.name.startswith('Walkable'):
                groups[name].remove(obj); bpy.data.objects.remove(obj, do_unlink=True)
before = set(bpy.data.objects)
exec(compile(ast.Module(body=tree.body[explorer_start:], type_ignores=[]), str(SOURCE), 'exec'), namespace)
explorer = list(set(bpy.data.objects)-before)
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,0))
ground=bpy.context.object;ground.name='Pilot ground / continuous plane';ground.data.materials.append(namespace['path'])
groups['ground'] = [ground]

def area(name,loc,power,color,size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.color=color; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
    return data
key=area('Source camera-left key',(-6,-3,12),1800,(1,.84,.63),7)
fill=area('Source sky fill',(4,6,10),650,(.66,.79,1),9)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED'; scene.render.threads=2
scene.render.resolution_x=256; scene.render.resolution_y=352; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'; scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.image_settings.color_depth='8'
scene.render.image_settings.compression=90
bpy.ops.object.camera_add(); camera=bpy.context.object; camera.data.type='ORTHO'; scene.camera=camera
angle=math.radians(58); up=Vector((0,math.sin(angle),math.cos(angle)))
target=up*(32/224); camera.location=target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=352/224
bpy.context.view_layer.update()
def pixel(point):
    p=world_to_camera_view(scene,camera,Vector(point)); return [p.x*256,(1-p.y)*352]
# Blender's portrait sensor fit is verified rather than assumed.
camera.data.ortho_scale *= (pixel((1,0,0))[0]-pixel((0,0,0))[0])/224
bpy.context.view_layer.update()
anchor=pixel((0,0,0)); assert max(abs(anchor[i]-[128,208][i]) for i in [0,1])<.001, anchor
receiver=namespace['box']('Separate shadow receiver',(0,0,-.015),(3,3,.02),namespace['path'],0)
receiver.is_shadow_catcher=True
all_mesh=[obj for group in groups.values() for obj in group]+explorer
records=[]
def frame(width,height,anchor_x,anchor_y):
    scene.render.resolution_x=width; scene.render.resolution_y=height
    target=up*((anchor_y-height/2)/224)
    camera.location=target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=max(width,height)/224
    bpy.context.view_layer.update()
    camera.data.ortho_scale *= (pixel((1,0,0))[0]-pixel((0,0,0))[0])/224 if width==256 else 1
for mood in ['daylight','dusk']:
    day=mood=='daylight'; key.energy=1800 if day else 1000; key.color=(1,.84,.63) if day else (.57,.68,1)
    fill.energy=650 if day else 550; fill.color=(.66,.79,1) if day else (.45,.54,1)
    scene.world.color=(.25,.25,.25) if day else (.15,.18,.25)
    for name in ['ground','wall','extinguisher','fire','exit','explorer-down','explorer-left','explorer-up','explorer-right']:
        active=explorer if name.startswith('explorer') else groups[name]
        if name.startswith('explorer'):
            rotation={'down':0,'left':-math.pi/2,'up':math.pi,'right':math.pi/2}[name.split('-')[1]]
            # Rotate original mesh transforms around the feet; never rotate an image.
            from mathutils import Matrix
            for obj in explorer:
                if 'pilot_original' not in obj: obj['pilot_original']=list(sum((list(row) for row in obj.matrix_world),[]))
                values=list(obj['pilot_original']); original=Matrix([values[i:i+4] for i in range(0,16,4)])
                obj.matrix_world=Matrix.Rotation(rotation,4,'Z') @ original
        for obj in all_mesh: obj.hide_render=obj not in active; obj.visible_camera=True
        for layer in (['body'] if name=='ground' else ['body','shadow']):
            if layer=='body':
                frame(256,352,128,208); size=[256,352]; layer_anchor=[128,208]
            else:
                # Larger ray-traced shadow canvas protects cast/soft-light tails.
                # finish.py downsamples this uniformly to 256² / cell width 112.
                frame(512,512,256,300); size=[512,512]; layer_anchor=[256,300]
            receiver.hide_render=layer!='shadow'
            for obj in active: obj.visible_camera=layer=='body'
            filename=f'{name}-{mood}-{layer}.png'
            if not ('--shadows-only' in sys.argv and layer=='body') and not ('--ground-only' in sys.argv and name!='ground'):
                scene.render.filepath=str(ROOT/'assets'/filename); bpy.ops.render.render(write_still=True)
            records.append({'file':filename,'role':name,'layer':layer,'mood':mood,'anchor':layer_anchor,'size':size,'cellWidth':224})
manifest={'blender':bpy.app.version_string,'engine':'Cycles CPU, 32 samples, no denoising','projection':{'elevation':58,'yaw':0,'anchor':anchor,'groundPitch':224*math.sin(angle),'heightRise':224*math.cos(angle)},'color':'AgX to sRGB, straight-alpha RGBA PNG; RGB edge dilation in finish.py','lighting':'Fixed source softboxes; dusk excludes position-dependent lantern pools','source':str(SOURCE.relative_to(ROOT.parent.parent)),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'license':'Original procedural geometry from repository PR #38; repository contribution terms; no external artwork','assets':records}
(ROOT/'assets/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('VIS04A_EXPORT_COMPLETE')
