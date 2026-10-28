"""Four true mesh facings, both moods, separate shadows and neutral turnarounds."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, WALL, FACINGS, IDENTITIES, geometry_digest, verify_inputs
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view


def frame(s,width=256,height=352,anchor=(128,208)):
    camera=s.camera;angle=math.radians(58);target=Vector((0,math.sin(angle),math.cos(angle)))*((anchor[1]-height/2)/224)
    s.render.resolution_x=width;s.render.resolution_y=height;s.render.resolution_percentage=100
    camera.data.type='ORTHO';camera.data.ortho_scale=max(width,height)/224
    camera.location=target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.view_layer.update()
    def px(point):
        p=world_to_camera_view(s,camera,Vector(point));return [p.x*width,(1-p.y)*height]
    origin=px((0,0,0));right=px((1,0,0));row=px((0,-1,0));top=px((0,0,1))
    assert max(abs(origin[i]-anchor[i]) for i in [0,1])<.001
    assert abs(right[0]-origin[0]-224)<.001
    assert abs(row[1]-origin[1]-WALL['projection']['groundPitch'])<.001
    assert abs(top[1]-origin[1]+WALL['projection']['heightRise'])<.001
    return {'origin':origin,'right':right,'row':row,'height':top}


def set_mood(s,mood):
    for name,key in [('key','Locked camera-left key'),('fill','Locked sky fill')]:
        data=next(o.data for o in s.objects if o.type=='LIGHT' and o.data.name.startswith(key))
        data.energy=WALL['lighting'][mood][name]['energy'];data.color=WALL['lighting'][mood][name]['color']
    s.world.color=WALL['lighting'][mood]['world']


if __name__ == '__main__':
    verify_inputs()
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['boy','girl']
    for character in args:
        folder=ROOT/'characters'/character
        bpy.ops.wm.open_mainfile(filepath=str(folder/'source/character-master.blend'))
        scene=bpy.context.scene;root=bpy.data.objects[IDENTITIES[character]]
        objects=[o for o in scene.objects if o.get('role')=='character-master']
        metadata=json.loads((folder/'assets/source.json').read_text())
        assert geometry_digest(objects)==metadata['geometrySha256']
        receiver=next(o for o in scene.objects if o.is_shadow_catcher)
        records=[]
        for mood in ['daylight','dusk']:
            set_mood(scene,mood)
            for facing,angle in FACINGS.items():
                root.rotation_euler.z=math.radians(angle);bpy.context.view_layer.update()
                for layer in ['body','shadow']:
                    shadow=layer=='shadow';width,height,anchor=(512,512,[256,300]) if shadow else (256,352,[128,208])
                    projection=frame(scene,width,height,anchor)
                    receiver.hide_render=not shadow
                    for obj in objects:obj.visible_camera=not shadow
                    path=folder/'assets'/f'{character}-{facing}-{mood}-{layer}.png'
                    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
                    records.append({'file':path.name,'characterId':IDENTITIES[character],'facing':facing,'mood':mood,'layer':layer,
                                    'size':[width,height],'anchor':anchor,'cellWidth':224,'projectionSamples':projection,
                                    'meshSha256':metadata['geometrySha256']})
        # Neutral full-body directions use one separate, explicitly labeled studio
        # camera/light arrangement. They are not alternate gameplay projections.
        set_mood(scene,'daylight');receiver.hide_render=True
        for obj in objects:obj.visible_camera=True
        s=scene;c=s.camera;s.render.resolution_x=512;s.render.resolution_y=768
        c.data.ortho_scale=1.55;c.location=(0,-5,1.02);target=Vector((0,0,.68))
        c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
        d=bpy.data.lights.new('Neutral portrait-only face softbox','AREA');d.energy=110;d.shape='DISK';d.size=3
        o=bpy.data.objects.new('Neutral portrait-only face softbox',d);s.collection.objects.link(o);o.location=(0,-3,1.6)
        o.rotation_euler=(Vector((0,0,.95))-o.location).to_track_quat('-Z','Y').to_euler()
        for facing,angle in FACINGS.items():
            root.rotation_euler.z=math.radians(angle)
            s.render.filepath=str(folder/'evidence'/f'turnaround-{facing}.png');bpy.ops.render.render(write_still=True)
        # Inspect actual facial geometry and eye identity at a useful authoring size.
        root.rotation_euler.z=math.radians(-14);s.render.resolution_x=s.render.resolution_y=640
        c.data.ortho_scale=.60;c.location=(0,-4,1.45);target=Vector((0,0,1.08))
        c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
        s.render.filepath=str(folder/'evidence/face-detail.png');bpy.ops.render.render(write_still=True)
        metadata['assets']=records
        (folder/'assets/manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
        print('CHARACTER_RENDER_COMPLETE',character,flush=True)
