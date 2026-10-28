"""Clean-process-style GLB import and source comparison, no source-file writes.
The GLB is copied alone into a temporary directory after factory-resetting all
Blender data. Lookdev lights/camera are created only after import checks pass.
"""
import hashlib
import json
import math
import struct
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector, kdtree

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'assets/wall-master.glb'
manifest = json.loads((ROOT/'assets/manifest.json').read_text())
record = json.loads((ROOT/'evidence/glb-export.json').read_text())
data = PATH.read_bytes()
magic, version, length = struct.unpack_from('<4sII', data)
assert magic == b'glTF' and version == 2 and length == len(data)
json_length, kind = struct.unpack_from('<I4s', data, 12)
assert kind == b'JSON'
gltf = json.loads(data[20:20+json_length])
bin_length, kind = struct.unpack_from('<I4s', data, 20+json_length)
assert kind == b'BIN\0'
binary = data[28+json_length:28+json_length+bin_length]
assert gltf['asset']['version'] == '2.0'
assert len(gltf['buffers']) == 1 and 'uri' not in gltf['buffers'][0]
assert not gltf.get('cameras') and not gltf.get('animations') and not gltf.get('skins')
assert 'KHR_lights_punctual' not in gltf.get('extensionsUsed', [])
assert len(gltf['meshes']) == 1 and len(gltf['nodes']) == 2
assert len(gltf['scenes'][0]['nodes']) == 1
root = gltf['nodes'][gltf['scenes'][0]['nodes'][0]]
assert 'mesh' not in root and len(root['children']) == 1
assert root.get('translation',[0,0,0]) == [0,0,0]
assert root.get('scale',[1,1,1]) == [1,1,1]
assert root.get('rotation',[0,0,0,1]) == [0,0,0,1]
embedded = []
for image in gltf['images']:
    assert image['mimeType'] == 'image/png' and 'uri' not in image
    view = gltf['bufferViews'][image['bufferView']]
    offset = view.get('byteOffset',0)
    png = binary[offset:offset+view['byteLength']]
    assert png[:8] == b'\x89PNG\r\n\x1a\n'
    dimensions = list(struct.unpack_from('>II',png,16))
    assert dimensions == [1024,1024]
    sha = hashlib.sha256(png).hexdigest()
    assert sha in {t['sha256'] for t in record['textures']}
    embedded.append({'name':image['name'],'size':dimensions,'sha256':sha,'bytes':len(png)})
assert len(embedded) == 2
for m in gltf['materials']:
    pbr = m['pbrMetallicRoughness']
    assert 'baseColorTexture' in pbr and 'normalTexture' in m
    original = next(a for a in record['materials'] if a['name'] == m['name'])
    assert abs(pbr.get('roughnessFactor',1)-original['roughness']) < 1e-6
    assert abs(pbr.get('metallicFactor',1)-original['metallic']) < 1e-6


def accessor(index):
    a = gltf['accessors'][index]; v = gltf['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126 and 'sparse' not in a
    n = {'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    offset = v.get('byteOffset',0)+a.get('byteOffset',0)
    return np.ndarray((a['count'],n),dtype='<f4',buffer=binary,offset=offset,
                      strides=(v.get('byteStride',4*n),4)).copy()


native_positions = []
max_tangent_length_error, max_tangent_normal_dot = 0., 0.
for primitive in gltf['meshes'][0]['primitives']:
    assert primitive.get('mode',4) == 4
    attrs = primitive['attributes']
    assert all(name in attrs for name in ['POSITION','NORMAL','TANGENT','TEXCOORD_0'])
    positions, normals, tangents, uv = [accessor(attrs[name]) for name in ['POSITION','NORMAL','TANGENT','TEXCOORD_0']]
    for arr in [positions,normals,tangents,uv]: assert np.isfinite(arr).all()
    assert np.max(np.abs(np.linalg.norm(normals,axis=1)-1)) < 1e-5
    # Export finishing restores unit/orthogonal tangent frames after Blender's
    # four-decimal tangent conversion, without modifying the exported normals.
    tangent_error = float(np.max(np.abs(np.linalg.norm(tangents[:,:3],axis=1)-1)))
    tangent_dot = float(np.max(np.abs((normals*tangents[:,:3]).sum(axis=1))))
    assert tangent_error < 1e-5 and tangent_dot < 1e-5
    max_tangent_length_error = max(max_tangent_length_error,tangent_error)
    max_tangent_normal_dot = max(max_tangent_normal_dot,tangent_dot)
    assert np.min(uv)>=-1e-6 and np.max(uv)<=1+1e-6
    native_positions.extend(positions.tolist())
native_bounds = np.array([[min(v[i] for v in native_positions),max(v[i] for v in native_positions)] for i in range(3)])
assert np.max(np.abs(native_bounds-np.array([[-.5,.5],[0,.595],[-.5,.5]]))) < 1e-5


def profile(objects):
    dg = bpy.context.evaluated_depsgraph_get()
    positions, corners, area, triangles, uv_values = [], [], 0., 0, []
    signed_volume = 0.
    for obj in objects:
        mesh = obj.evaluated_get(dg).to_mesh(preserve_all_data_layers=True,depsgraph=dg)
        mesh.calc_loop_triangles()
        transform = obj.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        for vertex in mesh.vertices: positions.append(transform@vertex.co)
        for loop in mesh.loops:
            corners.append((transform@mesh.vertices[loop.vertex_index].co,
                            (normal_transform@mesh.corner_normals[loop.index].vector).normalized()))
        for tri in mesh.loop_triangles:
            a,b,c = [transform@mesh.vertices[i].co for i in tri.vertices]
            area += (b-a).cross(c-a).length/2
            signed_volume += a.dot(b.cross(c))/6
            triangles += 1
        if mesh.uv_layers:
            uv_values.extend([list(v.uv) for v in mesh.uv_layers.active.data])
        obj.evaluated_get(dg).to_mesh_clear()
    bounds = [[min(v[i] for v in positions),max(v[i] for v in positions)] for i in range(3)]
    return {'positions':positions,'corners':corners,'area':area,'triangles':triangles,'bounds':bounds,'uv':uv_values,
            'signedVolume':signed_volume}


def configure_render():
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.samples = 32; s.cycles.seed = 30
    s.cycles.use_adaptive_sampling = False; s.cycles.use_denoising = False
    s.render.threads_mode = 'FIXED'; s.render.threads = 2
    s.render.resolution_x = 256; s.render.resolution_y = 352; s.render.resolution_percentage = 100
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'AgX'; s.view_settings.look = 'AgX - Medium High Contrast'
    angle = math.radians(58)
    up = Vector((0,math.sin(angle),math.cos(angle)))
    target = up*(32/224)
    bpy.ops.object.camera_add()
    camera = bpy.context.object; camera.data.type = 'ORTHO'; camera.data.ortho_scale = 352/224
    camera.location = target+Vector((0,-25*math.cos(angle),25*math.sin(angle)))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    s.camera = camera
    if s.world is None: s.world = bpy.data.worlds.new('Neutral audit world')
    s.world.use_nodes = world_state['useNodes']
    if world_state['useNodes']:
        background = s.world.node_tree.nodes.get('Background')
        background.inputs['Color'].default_value = world_state['backgroundColor']
        background.inputs['Strength'].default_value = world_state['backgroundStrength']
    return s


def render_moods(prefix):
    # These lights/camera belong ONLY to QA renders, never to the GLB.
    s = configure_render()
    lights = []
    for name in ['key','fill']:
        spec = manifest['lighting']['daylight'][name]
        d = bpy.data.lights.new('QA '+name,'AREA'); d.shape = 'DISK'; d.size = spec['size']
        o = bpy.data.objects.new('QA '+name,d); s.collection.objects.link(o)
        o.location = spec['position']; o.rotation_euler = (-o.location).to_track_quat('-Z','Y').to_euler()
        lights.append(d)
    for mood in ['daylight','dusk']:
        for name,d in zip(['key','fill'],lights):
            d.energy = manifest['lighting'][mood][name]['energy']; d.color = manifest['lighting'][mood][name]['color']
        s.world.color = manifest['lighting'][mood]['world']
        s.render.filepath = str(ROOT/'evidence'/f'{prefix}-{mood}.png')
        bpy.ops.render.render(write_still=True)


bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source/wall-master.blend'))
world = bpy.context.scene.world
world_state = {'useNodes':world.use_nodes}
if world.use_nodes:
    background = world.node_tree.nodes.get('Background')
    assert background and all(n.type in ['BACKGROUND','OUTPUT_WORLD'] for n in world.node_tree.nodes)
    world_state.update(backgroundColor=list(background.inputs['Color'].default_value),
                       backgroundStrength=background.inputs['Strength'].default_value)
walls = [o for o in bpy.context.scene.objects if o.get('role') == 'wall-master']
source = profile(walls)
for obj in list(bpy.context.scene.objects):
    if obj not in walls: bpy.data.objects.remove(obj,do_unlink=True)
render_moods('glb-source')
# No .blend data or paths survive this reset. Import only an isolated GLB copy.
bpy.ops.wm.read_factory_settings(use_empty=True)
assert len(bpy.data.objects) == 0 and len(bpy.data.images) == 0
with tempfile.TemporaryDirectory(prefix='fort-custer-glb-') as directory:
    isolated = Path(directory)/'wall-master.glb'; isolated.write_bytes(data)
    bpy.ops.import_scene.gltf(filepath=str(isolated))
    imported_objects = list(bpy.context.scene.objects)
    assert sorted(o.type for o in imported_objects) == ['EMPTY','MESH']
    parent = next(o for o in imported_objects if o.type == 'EMPTY')
    mesh = next(o for o in imported_objects if o.type == 'MESH')
    assert mesh.parent == parent
    for o in imported_objects:
        assert max(abs(o.matrix_world[i][j]-Matrix.Identity(4)[i][j]) for i in range(4) for j in range(4)) < 1e-6
    assert all(image.packed_file for image in bpy.data.images)
    assert len(bpy.data.images) == 2
    result = profile([mesh])
    assert np.max(np.abs(np.array(result['bounds'])-np.array(source['bounds']))) < 1e-6
    assert abs(result['area']-source['area']) < 1e-5
    assert result['signedVolume']>0 and abs(result['signedVolume']-source['signedVolume'])<1e-6
    assert result['triangles'] == source['triangles']
    assert np.isfinite(np.array(result['uv'])).all() and len(result['uv'])>0
    tree = kdtree.KDTree(len(source['corners']))
    for i,(position,normal) in enumerate(source['corners']): tree.insert(position,i)
    tree.balance()
    max_distance, min_dot = 0., 1.
    for position,normal in result['corners']:
        matches = tree.find_range(position,2e-6)
        assert matches, list(position)
        max_distance = max(max_distance,min(m[2] for m in matches))
        min_dot = min(min_dot,max(normal.dot(source['corners'][i][1]) for _,i,_ in matches))
    assert min_dot > .99999, min_dot
    # Test the reverse direction too: exporter must not omit a component.
    imported_tree = kdtree.KDTree(len(result['positions']))
    for i,p in enumerate(result['positions']): imported_tree.insert(p,i)
    imported_tree.balance()
    reverse_distance = max(imported_tree.find(p)[2] for p in source['positions'])
    assert reverse_distance < 2e-6
    # Both basis and winding must remain correct, not just a matching bbox.
    floor_hit = bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((0,0,2)),Vector((0,0,-1)))
    assert floor_hit[0] and abs(floor_hit[1].z-.094)<1e-5 and floor_hit[2].z>.99
    import_state = {'objects':[{ 'name':o.name,'type':o.type} for o in imported_objects],
                    'images':[{'name':i.name,'packed':bool(i.packed_file),'size':list(i.size)} for i in bpy.data.images],
                    'sourceBlendLoadedDuringImport':False,'onlyFileInImportDirectory':'wall-master.glb',
                    'lights':0,'cameras':0}
    render_moods('glb-reimport')
    report = {'status':'PASS','glbSha256':hashlib.sha256(data).hexdigest(),'sourceBlendSha256':record['sourceBlendSha256'],
              'importStateBeforeLookdev':import_state,'nativeGlTFBounds':native_bounds.tolist(),
              'reimportBounds':result['bounds'],'rootPivot':[0,0,0],'rootScale':[1,1,1],
              'triangles':result['triangles'],'surfaceArea':result['area'],'surfaceAreaDelta':abs(result['area']-source['area']),
              'signedVolume':result['signedVolume'],'signedVolumeDelta':abs(result['signedVolume']-source['signedVolume']),
              'maxPositionError':max_distance,'reverseMaxPositionError':reverse_distance,'minimumSourceNormalDot':min_dot,
              'embeddedTextures':embedded,'materials':len(gltf['materials']),'uvLoops':len(result['uv']),
              'maxTangentUnitLengthError':max_tangent_length_error,'maxTangentNormalDot':max_tangent_normal_dot,
              'upwardFloorRay':{'point':list(floor_hit[1]),'normal':list(floor_hit[2])},
              'renderCamera':'58 degree elevation / yaw 0 / 224px cell / 256x352 / anchor (128,208)',
              'qaWorldShader':world_state,
              'limitations':record['materialTreatment']['losses'],'review':'Author validation only; independent QA and owner approval pending'}
    (ROOT/'evidence/glb-reimport.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: isolated GLB import, PBR/embedded textures, UVs, positions/normals, pivot/bounds and matched two-mood renders')
