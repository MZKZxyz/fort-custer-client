"""Blender 4.3.2. Static GLB import/normalization; never retopologizes or rigs.
blender -b -t 4 --python-exit-code 1 --python render.py -- \
  --inputs /private/inputs.json --private-output /private/normalized --stage neutral
Run neutral first, inspect actual views, then sprites. Originals are read-only.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
WALL=json.loads((ROOT.parent/'batch-01/assets/manifest.json').read_text())
FACINGS={'south':0,'east':90,'north':180,'west':-90}
HEIGHTS=[.95,1.15,1.34]

def bounds(objects):
    p=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    return [[min(v[i] for v in p),max(v[i] for v in p)] for i in range(3)]

def setup():
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=32;s.cycles.seed=30
    s.cycles.use_denoising=False;s.cycles.use_adaptive_sampling=False;s.cycles.use_animated_seed=False
    s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
    s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.image_settings.color_depth='8'
    s.render.resolution_percentage=100
    s.world=bpy.data.worlds.new('World');s.world.use_nodes=True
    for name in ['key','fill']:
        v=WALL['lighting']['daylight'][name];d=bpy.data.lights.new(name,'AREA');d.shape='DISK';d.size=v['size']
        o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=v['position'];o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();s.camera=bpy.context.object;s.camera.data.type='ORTHO'
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.005));receiver=bpy.context.object;receiver.name='Shadow receiver';receiver.is_shadow_catcher=True
    m=bpy.data.materials.new('Neutral catcher');m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.35,.3,.22,1)
    receiver.data.materials.append(m);receiver.hide_render=True
    return s,receiver

def mood(s,name):
    v=WALL['lighting'][name]
    for key in ['key','fill']:
        bpy.data.lights[key].energy=v[key]['energy'];bpy.data.lights[key].color=v[key]['color']
    s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(*v['world'],1)
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=1

def frame(s,width,height,anchor,cell=224):
    a=math.radians(58);target=Vector((0,math.sin(a),math.cos(a)))*((anchor[1]-height/2)/cell)
    c=s.camera;s.render.resolution_x=width;s.render.resolution_y=height;c.data.ortho_scale=max(width,height)/cell
    c.location=target+Vector((0,-25*math.cos(a),25*math.sin(a)));c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.view_layer.update()
    samples=[]
    for pt in [(0,0,0),(1,0,0),(0,-1,0),(0,0,1)]:
        p=world_to_camera_view(s,c,Vector(pt));samples.append([p.x*width,(1-p.y)*height])
    assert max(abs(samples[0][i]-anchor[i]) for i in [0,1])<.001
    assert abs(samples[1][0]-samples[0][0]-cell)<.001
    assert abs(samples[2][1]-samples[0][1]-cell*math.sin(a))<.001
    assert abs(samples[3][1]-samples[0][1]+cell*math.cos(a))<.001
    return samples

def render(s,path):
    path.parent.mkdir(parents=True,exist_ok=True);s.render.filepath=str(path);bpy.ops.render.render(write_still=True)

def run(a):
    a.inputs=a.inputs.resolve();a.private_output=a.private_output.resolve()
    inputs=json.loads(a.inputs.read_text());audit=json.loads((ROOT/'evidence/source-audit.json').read_text())
    for identity,path in inputs.items():
        if a.only and identity!=a.only:continue
        path=Path(path);source=next(v for v in audit['sources'] if v['id']==identity)
        assert hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256']
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
        before=bounds(objects)
        # glTF importer maps +Y up / +Z front into Blender +Z up / -Y front.
        # Observed neutral turnarounds must confirm this anatomical heading.
        h=before[2][1]-before[2][0];center=[(before[i][0]+before[i][1])/2 for i in [0,1]]
        norm=Matrix.Scale(1.15/h,4)@Matrix.Translation(Vector((-center[0],-center[1],-before[2][0])))
        for o in objects:
            o.data.transform(norm@o.matrix_world);o.matrix_world=Matrix.Identity(4)
        bpy.context.view_layer.update()
        root=bpy.data.objects.new(identity,None);bpy.context.scene.collection.objects.link(root)
        for o in objects:o.parent=root
        after=bounds(objects)
        mesh=objects[0].data;mesh.calc_loop_triangles()
        uv=mesh.uv_layers.active
        uv_values=[tuple(v.uv) for v in uv.data] if uv else []
        record={'id':identity,'sourceSha256':source['sha256'],'blender':bpy.app.version_string,'importBounds':before,'normalizedBounds':after,
          'sourceToBlenderNormalization':[list(row) for row in norm], 'heightCells':1.15,'groundPivot':[0,0,0],
          'axes':'+X right, -Y south/front, +Z up; glTF +Y up/+Z front',
          'triangles':sum(len(o.data.loop_triangles) for o in objects),'vertices':sum(len(o.data.vertices) for o in objects),
          'uvLayers':[u.name for u in mesh.uv_layers],'uvLoopCount':len(uv_values),
          'uvBounds':[[min(v[i] for v in uv_values),max(v[i] for v in uv_values)] for i in [0,1]],
          'materials':[m.name for m in bpy.data.materials],'images':[{'name':im.name,'size':list(im.size),'colorspace':im.colorspace_settings.name,'packed':bool(im.packed_file)} for im in bpy.data.images],
          'armatures':sum(o.type=='ARMATURE' for o in bpy.context.scene.objects),'actions':len(bpy.data.actions),
          'topologyModified':False,'normalization':'Uniform scale and translation only; imported PBR graph retained; no texture rebake or decimation.'}
        out=a.private_output/identity;out.mkdir(parents=True,exist_ok=True)
        if a.stage=='sprites':
            for im in bpy.data.images:
                if not im.packed_file:im.pack()
            bpy.context.preferences.filepaths.save_version=0
            bpy.ops.wm.save_as_mainfile(filepath=str(out/'normalized.blend'))
            bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
            for o in objects:o.select_set(True)
            bpy.ops.export_scene.gltf(filepath=str(out/'normalized.glb'),export_format='GLB',use_selection=True,export_animations=False)
            record['privateArtifacts']=[{'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(out.iterdir()) if f.suffix in ['.blend','.glb']]
        s,receiver=setup();mood(s,'daylight')
        if a.stage=='neutral':
            # Separate neutral inspection camera, explicitly not the gameplay camera.
            s.render.resolution_x=512;s.render.resolution_y=768;s.camera.data.ortho_scale=1.4
            target=Vector((0,0,.575));s.camera.location=(0,-5,.85);s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler()
            for facing,angle in FACINGS.items():
                root.rotation_euler.z=math.radians(angle);render(s,ROOT/'evidence'/f'{identity}-neutral-{facing}.png')
        else:
            records=[]
            for height in HEIGHTS:
                root.scale=(height/1.15,)*3
                for name in ['daylight','dusk']:
                    mood(s,name)
                    for facing,angle in FACINGS.items():
                        root.rotation_euler.z=math.radians(angle)
                        for layer in ['body','shadow']:
                            shadow=layer=='shadow';receiver.hide_render=not shadow
                            for o in objects:o.visible_camera=not shadow
                            samples=frame(s,512,512,[256,300]) if shadow else frame(s,256,352,[128,208])
                            file=f'assets/{identity}-{height:.2f}-{facing}-{name}-{layer}.png'
                            render(s,ROOT/file)
                            records.append({'file':file,'id':identity,'heightCells':height,'facing':facing,'mood':name,'layer':layer,'projectionSamples':samples})
            record['sprites']=records
        (ROOT/'evidence'/f'{identity}-{a.stage}.json').write_text(json.dumps(record,indent=2)+'\n')
        print('COMPLETE',identity,a.stage,flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--inputs',required=True,type=Path);p.add_argument('--private-output',required=True,type=Path)
    p.add_argument('--stage',choices=['neutral','sprites'],required=True);p.add_argument('--only');run(p.parse_args(sys.argv[sys.argv.index('--')+1:]))
