"""Issue #51: one editable structural master, six exports; no library expansion.
Run from any cwd: blender -b -t 2 --python /absolute/path/to/render.py
The approved source's definitions and wall builder are evaluated, not its scene.
"""
import ast
import hashlib
import json
import math
import random
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
BASE = ROOT.parent / 'reference-scene/iteration-2/source/render.py'
SEED = 30
random.seed(SEED)
tree = ast.parse(BASE.read_text())
loop = next(n for n in tree.body if isinstance(n, ast.For)
            and ast.unparse(n.target) == '(r, row)')
definitions = [n for n in tree.body[:tree.body.index(loop)]
               if not (isinstance(n, ast.Expr) and
                       ('write_text' in ast.unparse(n) or ast.unparse(n).startswith('box(')))]
ns = {'__file__': str(BASE)}
exec(compile(ast.Module(body=definitions, type_ignores=[]), str(BASE), 'exec'), ns)
ns['GRID'] = ['#']
ns['xy'] = lambda r, c: (0, 0)
exec(compile(ast.Module(body=[loop], type_ignores=[]), str(BASE), 'exec'), ns)
box, ball, mat = ns['box'], ns['ball'], ns['mat']


def grain(material, long_axis='X'):
    """Anisotropic, low contrast grain; all texture nodes are editable and packed."""
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    p = nodes.get('Principled BSDF')
    base = tuple(p.inputs['Base Color'].default_value)
    tex = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeVectorMath')
    mapping.operation = 'MULTIPLY'
    mapping.inputs[1].default_value = (1.8, 18, 8) if long_axis == 'X' else (18, 1.8, 8)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2
    noise.inputs['Detail'].default_value = 2
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .17
    ramp.color_ramp.elements[0].color = tuple(v * .50 for v in base[:3]) + (1,)
    ramp.color_ramp.elements[1].position = .83
    ramp.color_ramp.elements[1].color = tuple(min(1, v * 1.30) for v in base[:3]) + (1,)
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .13
    bump.inputs['Distance'].default_value = .012
    links.new(tex.outputs['Generated'], mapping.inputs[0])
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs[0])
    links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], p.inputs['Normal'])


for material in ns['wood']:
    grain(material)
grain(ns['end'])
# Keep baseline slat positions, silhouette and footing. The side faces' grain
# follows their long Y axis; caps and bolts never exceed the old .595 maximum.
for obj in list(bpy.data.objects):
    if obj.name.startswith('Corner upright'):
        # Recess the old post below its cap, so the cap fastener is exposed.
        # The hardware crown retains the original maximum height .595.
        obj.dimensions.z = .56
    if obj.name.startswith('Iron peg'):
        # Replace old pegs protruding .014 outside the collision square with
        # reference-derived inset hardware confined to the established cell.
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.name.startswith('Horizontal pallet slat') and obj.dimensions.y > obj.dimensions.x:
        m = obj.data.materials[0].copy()
        grain(m, 'Y')
        obj.data.materials[0] = m
iron = mat('Inset weathered iron / reference 01–04', (.18, .17, .14), rough=.65)
iron.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .65
for x in [-.436, .436]:
    for y in [-.436, .436]:
        box('End-grain corner cap', (x, y, .570), (.124, .124, .04), ns['end'], .008)
        ball('Inset cap bolt', (x, y, .589), (.018, .018, .006), iron)
        for z in [.16, .48]:
            ball('Front/back bolt', (x, math.copysign(.496, y), z), (.016, .004, .016), iron)
            ball('Side bolt', (math.copysign(.496, x), y, z), (.004, .016, .016), iron)
# A floor and inner battens clarify the well without changing outside geometry.
for i in range(5):
    box('Recessed floor plank', ((i-2)*.15, 0, .085), (.146, .77, .018), ns['wood'][i % 4], .004)
for y in [-.375, .375]:
    box('Inner frame batten', (0, y, .30), (.065, .035, .41), ns['wood'][0], .006)
wall = list(bpy.data.objects)
for obj in wall:
    obj['role'] = 'wall-master'
    obj['seed'] = SEED
    obj['ground_anchor'] = [0., 0., 0.]
bpy.ops.mesh.primitive_plane_add(size=1)
ground = bpy.context.object
ground.name = 'Packed earth / seamless ground'
ground.data.materials.append(ns['path'])
receiver = box('Separate shadow catcher', (0, 0, -.015), (3, 3, .02), ns['path'], 0)
receiver.is_shadow_catcher = True


def area(name, location, energy, color, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.size, data.shape = energy, color, size, 'DISK'
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()
    return data


key = area('Locked camera-left key', (-6, -3, 12), 1800, (1, .84, .63), 7)
fill = area('Locked sky fill', (4, 6, 10), 650, (.66, .79, 1), 9)
scene = bpy.context.scene
scene.name = 'Wall master / export rig'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.seed = SEED
scene.cycles.use_animated_seed = False
scene.cycles.use_denoising = False
scene.cycles.use_adaptive_sampling = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.render.resolution_percentage = 100
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = 'LOCKED / orthographic 58 elevation / 0 yaw'
camera.data.type = 'ORTHO'
scene.camera = camera
angle = math.radians(58)
up = Vector((0, math.sin(angle), math.cos(angle)))


def frame(width, height, anchor, cell=224):
    scene.render.resolution_x, scene.render.resolution_y = width, height
    target = up * ((anchor[1] - height/2) / cell)
    camera.location = target + Vector((0, -25*math.cos(angle), 25*math.sin(angle)))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = max(width, height) / cell
    bpy.context.view_layer.update()

    def pixel(point):
        p = world_to_camera_view(scene, camera, Vector(point))
        return [p.x * width, (1-p.y) * height]

    measurements = {str(p): pixel(p) for p in [(0, 0, 0), (1, 0, 0), (0, -1, 0), (0, 0, 1)]}
    origin, right, down, top = measurements.values()
    assert max(abs(origin[i]-anchor[i]) for i in [0, 1]) < .001
    assert abs(right[0]-origin[0]-cell) < .001
    assert abs(down[1]-origin[1]-cell*math.sin(angle)) < .001
    assert abs(top[1]-origin[1]+cell*math.cos(angle)) < .001
    return measurements


def mesh_digest():
    data = [(o.name, [list(row) for row in o.matrix_world],
             [list(v.co) for v in o.data.vertices],
             [list(p.vertices) for p in o.data.polygons]) for o in sorted(wall, key=lambda o: o.name)]
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
points = [o.matrix_world @ Vector(c) for o in wall for c in o.evaluated_get(depsgraph).bound_box]
bounds = [[min(p[i] for p in points), max(p[i] for p in points)] for i in range(3)]
assert all(abs(bounds[i][0]+.5) < 1e-5 and abs(bounds[i][1]-.5) < 1e-5 for i in [0, 1]), bounds
assert abs(bounds[2][1]-.595) < 1e-5, bounds
geometry_hash = mesh_digest()
records = []
lights = {}
for mood in ['daylight', 'dusk']:
    day = mood == 'daylight'
    key.energy, key.color = (1800, (1, .84, .63)) if day else (1050, (.48, .62, 1))
    fill.energy, fill.color = (650, (.66, .79, 1)) if day else (550, (.45, .55, .85))
    scene.world.color = (.25, .25, .25) if day else (.12, .15, .22)
    lights[mood] = {'key': {'position': [-6, -3, 12], 'energy': key.energy, 'color': list(key.color), 'size': 7},
                    'fill': {'position': [4, 6, 10], 'energy': fill.energy, 'color': list(fill.color), 'size': 9},
                    'world': list(scene.world.color)}
    for role, layer in [('wall', 'body'), ('wall', 'shadow'), ('ground', 'body')]:
        shadow = layer == 'shadow'
        width, height, anchor = (512, 512, [256, 300]) if shadow else (256, 352, [128, 208])
        measurements = frame(width, height, anchor)
        for obj in wall:
            obj.hide_render = role != 'wall'
            obj.visible_camera = not shadow
        ground.hide_render = role != 'ground'
        receiver.hide_render = not shadow
        assert mesh_digest() == geometry_hash
        file = f'{role}-{mood}-{layer}.png'
        scene.render.filepath = str(ROOT / 'assets' / file)
        bpy.ops.render.render(write_still=True)
        records.append({'file': file, 'role': role, 'layer': layer, 'mood': mood, 'size': [width, height],
                        'anchor': anchor, 'cellWidth': 224, 'projectionSamples': measurements, 'meshSha256': geometry_hash})
# Save a directly editable, self-contained rig in the normal body view.
frame(256, 352, [128, 208])
key.energy, key.color = 1800, (1, .84, .63)
fill.energy, fill.color = 650, (.66, .79, 1)
scene.world.color = (.25, .25, .25)
for obj in wall:
    obj.hide_render = False
    obj.visible_camera = True
ground.hide_render = receiver.hide_render = True
scene['approval'] = 'Issue 51 wall-master gate / awaiting owner and independent QA'
scene['footprint'] = '1x1 cells; ground pivot (0,0,0); max height .595'
scene.render.filepath = str(ROOT / 'assets' / 'wall-daylight-body.png')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source' / 'wall-master.blend'))
manifest = {'schema': 'fort-custer-wall-master-v1', 'approval': 'pending-owner-and-independent-QA',
            'blender': bpy.app.version_string, 'engine': 'Cycles CPU / 32 samples / no denoiser / fixed sampling', 'seed': SEED,
            'projection': {'elevation': 58, 'yaw': 0, 'radius': 25, 'bodyOrthoScale': 352/224,
                           'cellWidth': 224, 'groundPitch': 224*math.sin(angle), 'heightRise': 224*math.cos(angle)},
            'geometry': {'bounds': bounds, 'footprint': [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]],
                         'groundAnchor': [0, 0, 0], 'height': .595, 'meshSha256': geometry_hash, 'objects': len(wall)},
            'color': {'transform': 'AgX', 'look': 'Medium High Contrast', 'output': 'sRGB / straight RGBA8', 'exposure': 0, 'gamma': 1},
            'lighting': lights, 'assets': records,
            'materialPalette': [{'name': m.name, 'linearRGB': list(m.diffuse_color)[:3],
                                 'roughness': m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value}
                                for m in sorted({material for obj in wall for material in obj.data.materials}, key=lambda m:m.name)],
            'license': 'Original procedural geometry derived from repository PR 38 under repository contribution terms. Uploaded concepts are reference only; no new rights claim.',
            'provenance': 'references/reference_manifest.json; source pixel data is never used as a material or sprite'}
(ROOT / 'assets' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('BATCH01_MASTER_EXPORT_COMPLETE')
