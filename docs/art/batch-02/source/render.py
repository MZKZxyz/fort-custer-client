"""Three material-only treatments of the approved saved master; never rebuild it.
blender -b -t 2 --python-exit-code 1 --python <this file> [-- v02]
"""
import hashlib
import json
import math
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, BASE, APPROVED, NAMES, verify_inputs, geometry_hash
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

verify_inputs()
targets = [a for a in sys.argv[sys.argv.index('--')+1:]] if '--' in sys.argv else ['v02','v03','v04']
assert all(v in ['v02','v03','v04'] for v in targets)


def tint(rgb, variant, cap=False, repair=False):
    if variant=='v02':
        factor = (1.06,.98,.91) if repair else (.83,.87,.89)
        return tuple(min(1,max(0,rgb[i]*factor[i])) for i in range(3))
    if variant=='v03':
        factor = (.65,.69,.74) if cap else (.49,.56,.65)
        return tuple(rgb[i]*factor[i] for i in range(3))
    # Reduced chroma/contrast in sun-bleached wood; no directional wear gradient.
    sand = (.58,.50,.37) if not cap else (.72,.65,.51)
    return tuple(min(1,.68*rgb[i]+.32*sand[i]) for i in range(3))


def treat(variant):
    walls=[o for o in bpy.context.scene.objects if o.get('role')=='wall-master']
    materials=sorted({m for o in walls for m in o.data.materials},key=lambda m:m.name)
    changes=[]
    for m in materials:
        original_name=m.name
        wood=original_name.startswith('Pallet / honey') or original_name.startswith('Fresh end grain')
        iron=original_name.startswith('Inset weathered iron')
        if not (wood or iron): continue # Quiet blocked footing is unchanged.
        repair = variant=='v02' and original_name=='Pallet / honey 1.003'
        cap=original_name.startswith('Fresh')
        p=m.node_tree.nodes.get('Principled BSDF')
        before=list(p.inputs['Base Color'].default_value)
        if wood:
            p.inputs['Base Color'].default_value=(*tint(before[:3],variant,cap,repair),1)
            m.diffuse_color=(*tint(m.diffuse_color[:3],variant,cap,repair),1)
            for n in m.node_tree.nodes:
                if n.type=='VALTORGB':
                    for e in n.color_ramp.elements:
                        e.color=(*tint(e.color[:3],variant,cap,repair),1)
                if n.type=='BUMP': n.inputs['Strength'].default_value={'v02':.13,'v03':.16,'v04':.11}[variant]
            p.inputs['Roughness'].default_value={'v02':.90,'v03':.96,'v04':.94}[variant]
        else:
            color={'v02':(.155,.145,.12),'v03':(.105,.12,.105),'v04':(.20,.19,.16)}[variant]
            p.inputs['Base Color'].default_value=(*color,1);m.diffuse_color=(*color,1)
            p.inputs['Metallic'].default_value={'v02':.50,'v03':.32,'v04':.45}[variant]
            p.inputs['Roughness'].default_value={'v02':.74,'v03':.86,'v04':.78}[variant]
        # Keep assignments/material group count; repair is tone on an existing
        # plank material, with no patch geometry, extra fasteners or damage.
        m.name=variant+' / '+original_name
        changes.append({'sourceMaterial':original_name,'material':m.name,'repairTone':repair,
                        'usedBy':[o.name for o in walls if m in list(o.data.materials)],
                        'beforeBaseLinearRGBA':before,'afterBaseLinearRGBA':list(p.inputs['Base Color'].default_value),
                        'roughness':p.inputs['Roughness'].default_value,'metallic':p.inputs['Metallic'].default_value})
    return walls,changes


for variant in targets:
    out=ROOT/'variants'/variant
    for directory in ['source','assets','evidence']: (out/directory).mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BASE/'source/wall-master.blend'))
    scene=bpy.context.scene;camera=scene.camera
    walls,changes=treat(variant)
    digest=geometry_hash(walls)
    assert digest==APPROVED['geometry']['meshSha256']
    scene['variantId']=variant;scene['approval']='Issue 55 / proposed material appearance / owner approval pending'
    scene.render.filepath=str(out/'assets/wall-daylight-body.png')
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'source/wall-master.blend'))
    ground=next(o for o in scene.objects if o.name.startswith('Packed earth'))
    receiver=next(o for o in scene.objects if o.is_shadow_catcher)
    key=bpy.data.lights['Locked camera-left key'];fill=bpy.data.lights['Locked sky fill']
    angle=math.radians(58);up=Vector((0,math.sin(angle),math.cos(angle)))
    records=[]
    for mood in ['daylight','dusk']:
        for name,light in [('key',key),('fill',fill)]:
            spec=APPROVED['lighting'][mood][name];light.energy=spec['energy'];light.color=spec['color']
        scene.world.color=APPROVED['lighting'][mood]['world'] # Retain actual source World shader as well.
        for layer in ['body','shadow']:
            shadow=layer=='shadow'
            width,height,anchor=(512,512,[256,300]) if shadow else (256,352,[128,208])
            scene.render.resolution_x=width;scene.render.resolution_y=height
            target=up*((anchor[1]-height/2)/224)
            camera.location=target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
            camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.data.ortho_scale=max(width,height)/224
            ground.hide_render=True;receiver.hide_render=not shadow
            for o in walls: o.hide_render=False;o.visible_camera=not shadow
            bpy.context.view_layer.update()
            samples={}
            for point in [(0,0,0),(1,0,0),(0,-1,0),(0,0,1)]:
                p=world_to_camera_view(scene,camera,Vector(point));samples[str(point)]=[p.x*width,(1-p.y)*height]
            origin,right,down,top=samples.values()
            assert max(abs(origin[i]-anchor[i]) for i in [0,1])<.001
            assert abs(right[0]-origin[0]-224)<.001
            assert abs(down[1]-origin[1]-APPROVED['projection']['groundPitch'])<.001
            assert abs(top[1]-origin[1]+APPROVED['projection']['heightRise'])<.001
            assert geometry_hash(walls)==digest
            filename=f'wall-{mood}-{layer}.png'
            scene.render.filepath=str(out/'assets'/filename);bpy.ops.render.render(write_still=True)
            records.append({'file':filename,'role':'wall','layer':layer,'mood':mood,
                            'size':[width,height],'anchor':anchor,'cellWidth':224,'projectionSamples':samples,'meshSha256':digest})
    metadata={'variantId':variant,'name':NAMES[variant],'approval':'proposed / owner visual approval pending',
              'blender':bpy.app.version_string,'engine':APPROVED['engine'],'seed':30,
              'geometry':APPROVED['geometry'],'projection':APPROVED['projection'],'color':APPROVED['color'],
              'lighting':APPROVED['lighting'],'materials':changes,'assets':records,
              'sourceBlendSha256':hashlib.sha256((out/'source/wall-master.blend').read_bytes()).hexdigest(),
              'license':APPROVED['license'],'provenance':'Material-only derivative of owner-approved Batch 01; no uploaded pixels used as textures'}
    (out/'assets/manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print('BATCH02_VARIANT_RENDER_COMPLETE',variant,flush=True)
