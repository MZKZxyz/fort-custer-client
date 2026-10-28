"""Build two original editable masters, prove four-facing fit, render previews."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, WALL, IDENTITIES, FACINGS, record
from model import build
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view


def profile(objects):
    dg=bpy.context.evaluated_depsgraph_get()
    points=[o.matrix_world@v.co for o in objects for v in o.evaluated_get(dg).data.vertices]
    return [[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]


def official_frame():
    s=bpy.context.scene;c=s.camera;angle=math.radians(58)
    target=Vector((0,math.sin(angle),math.cos(angle)))*(32/224)
    c.location=target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
    c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=352/224
    s.render.resolution_x=256;s.render.resolution_y=352
    bpy.context.view_layer.update()


def project_fit(objects):
    s=bpy.context.scene;dg=bpy.context.evaluated_depsgraph_get();pixels=[]
    for o in objects:
        evaluated=o.evaluated_get(dg)
        for v in evaluated.data.vertices:
            p=world_to_camera_view(s,s.camera,o.matrix_world@v.co);pixels.append([p.x*256,(1-p.y)*352])
    bounds=[[min(v[i] for v in pixels),max(v[i] for v in pixels)] for i in [0,1]]
    assert bounds[0][0]>=15 and bounds[0][1]<=241 and bounds[1][0]>=15 and bounds[1][1]<=337,bounds
    return bounds


args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['boy','girl']
for character in args:
    assert character in IDENTITIES
    folder=ROOT/'characters'/character
    for name in ['source','assets','evidence']:(folder/name).mkdir(parents=True,exist_ok=True)
    root,objects,metadata=build(character)
    scene=bpy.context.scene
    metadata['worldBounds']=profile(objects);metadata['components']=len(objects)
    metadata['provisionalHeightCells']=metadata['worldBounds'][2][1];metadata['wallHeightRatio']=metadata['provisionalHeightCells']/.595
    metadata['facingProjectedBounds']={}
    official_frame()
    for direction,angle in FACINGS.items():
        root.rotation_euler.z=math.radians(angle);bpy.context.view_layer.update()
        metadata['facingProjectedBounds'][direction]=project_fit(objects)
    root.rotation_euler.z=0;bpy.context.view_layer.update()
    scene['characterId']=IDENTITIES[character];scene['approval']='Issue 57 / owner proportion and appearance gate'
    scene.render.filepath='//../assets/'+character+'-south-daylight-body.png'
    bpy.context.preferences.filepaths.save_version=0
    path=folder/'source/character-master.blend';bpy.ops.wm.save_as_mainfile(filepath=str(path))
    metadata['source']=record(path);metadata['projection']=WALL['projection'];metadata['color']=WALL['color'];metadata['lighting']=WALL['lighting']
    metadata['blender']=bpy.app.version_string;metadata['approval']='proposed / independent Art QA and owner approval pending'
    (folder/'assets/source.json').write_text(json.dumps(metadata,indent=2)+'\n')
    if '--preview' not in sys.argv:
        print('CHARACTER_MASTER_BUILT',character,metadata['worldBounds'],flush=True)
        continue
    # Initial neutral portrait under a real camera, plus exact official front.
    scene.cycles.samples=32
    scene.render.filepath=str(folder/'evidence/initial-south-58.png');bpy.ops.render.render(write_still=True)
    camera=scene.camera;camera.location=(0,-5,1.05);target=Vector((0,0,.73))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=1.6
    d=bpy.data.lights.new('Initial neutral-only face softbox','AREA');d.energy=110;d.size=3;d.shape='DISK'
    o=bpy.data.objects.new('Initial neutral-only face softbox',d);scene.collection.objects.link(o);o.location=(0,-3,1.6)
    o.rotation_euler=(Vector((0,0,.95))-o.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=512;scene.render.resolution_y=768
    scene.render.filepath=str(folder/'evidence/initial-front-neutral.png');bpy.ops.render.render(write_still=True)
    print('CHARACTER_MASTER_BUILT',character,metadata['worldBounds'],flush=True)
