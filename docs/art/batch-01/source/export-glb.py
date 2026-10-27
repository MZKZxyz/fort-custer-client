"""Wall-only portable master. Does not modify .blend, sprites or render source.
blender -b -t 2 --python-exit-code 1 --python <this file>
"""
import hashlib
import json
import struct
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector, kdtree

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SIZE = 1024
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source/wall-master.blend'))
scene = bpy.context.scene
dg = bpy.context.evaluated_depsgraph_get()
source = sorted([o for o in scene.objects if o.get('role') == 'wall-master'], key=lambda o:o.name)
assert source and all(o.type == 'MESH' for o in source)
# Freeze the exact evaluated bevels/weighted normals; retain the editable
# components in the unchanged .blend. Joining is only for interchange/instancing.
copies = []
source_corners = []
for obj in source:
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for loop in mesh.loops:
        source_corners.append((obj.matrix_world@mesh.vertices[loop.vertex_index].co,
                               (normal_matrix@mesh.corner_normals[loop.index].vector).normalized()))
    # Generated shader coordinates are local to each original component. Retain
    # that field explicitly before joining, so the bake doesn't stretch grain
    # over the entire assembled wall's bounding box.
    coordinates = [v.co.copy() for v in mesh.vertices]
    low = Vector(tuple(min(v[i] for v in coordinates) for i in range(3)))
    high = Vector(tuple(max(v[i] for v in coordinates) for i in range(3)))
    attribute = mesh.attributes.new('source_generated', 'FLOAT_VECTOR', 'POINT')
    for v, item in zip(coordinates, attribute.data):
        item.vector = tuple((v[i]-low[i])/(high[i]-low[i]) if high[i]>low[i] else 0 for i in range(3))
    copy = bpy.data.objects.new(obj.name+' / portable', mesh)
    scene.collection.objects.link(copy)
    copy.matrix_world = obj.matrix_world.copy()
    copies.append(copy)
bpy.ops.object.select_all(action='DESELECT')
for obj in copies: obj.select_set(True)
bpy.context.view_layer.objects.active = copies[0]
bpy.ops.object.join()
model = bpy.context.object
model.name = 'Pallet wall / one cell'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tri = model.modifiers.new('Frozen triangulation for tangent-space bake', 'TRIANGULATE')
tri.keep_custom_normals = True
bpy.ops.object.modifier_apply(modifier=tri.name)
# Joining nonuniformly scaled meshes can otherwise drift weighted/split normals.
# Restore the exact evaluated source corner normals in world space (now also
# this identity-transformed model's local space) before tangent-space baking.
normal_tree = kdtree.KDTree(len(source_corners))
for i,(position,normal_value) in enumerate(source_corners): normal_tree.insert(position,i)
normal_tree.balance()
restored_normals = []
for loop in model.data.loops:
    matches = normal_tree.find_range(model.data.vertices[loop.vertex_index].co,2e-6)
    assert matches
    current = model.data.corner_normals[loop.index].vector
    _, index, _ = max(matches,key=lambda item:current.dot(source_corners[item[1]][1]))
    restored_normals.append(source_corners[index][1])
model.data.normals_split_custom_set(restored_normals)
for obj in list(scene.objects):
    if obj != model: bpy.data.objects.remove(obj, do_unlink=True)
# One non-overlapping atlas shared across the material primitives, not one
# texture per slat. UV generation happens AFTER freezing evaluated geometry.
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.1519173, island_margin=.008, margin_method='FRACTION', correct_aspect=True)
bpy.ops.object.mode_set(mode='OBJECT')
model.data.uv_layers.active.name = 'Portable atlas'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.seed = 30
scene.cycles.use_adaptive_sampling = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.bake.margin = 4
scene.render.bake.use_clear = True
scene.render.bake.use_selected_to_active = False
materials = list(model.data.materials)
for material in materials:
    nodes, links = material.node_tree.nodes, material.node_tree.links
    attr = nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'source_generated'
    for node in list(nodes):
        if node.type == 'TEX_COORD':
            for link in list(node.outputs['Generated'].links):
                links.new(attr.outputs['Vector'], link.to_socket)
        if node.type == 'TEX_NOISE' and not node.inputs['Vector'].is_linked:
            links.new(attr.outputs['Vector'], node.inputs['Vector'])
base = bpy.data.images.new('Wall master / unlit base color', width=SIZE, height=SIZE, alpha=False)
base.colorspace_settings.name = 'sRGB'
normal = bpy.data.images.new('Wall master / tangent normal', width=SIZE, height=SIZE, alpha=False, is_data=True)
normal.colorspace_settings.name = 'Non-Color'


def target(image):
    for m in materials:
        for n in m.node_tree.nodes: n.select = False
        node = m.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        node.select = True
        m.node_tree.nodes.active = node


target(base)
# Bake the actual Base Color through a temporary emission surface. Diffuse-color
# passes can darken metallic materials; emission also excludes lighting and AO.
surfaces = []
for m in materials:
    nodes, links = m.node_tree.nodes, m.node_tree.links
    p = nodes.get('Principled BSDF')
    output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
    previous = output.inputs['Surface'].links[0].from_socket
    emission = nodes.new('ShaderNodeEmission')
    color = p.inputs['Base Color']
    if color.is_linked: links.new(color.links[0].from_socket,emission.inputs['Color'])
    else: emission.inputs['Color'].default_value = color.default_value
    links.new(emission.outputs['Emission'],output.inputs['Surface'])
    surfaces.append((m,output,previous,emission))
bpy.ops.object.bake(type='EMIT')
for m,output,previous,emission in surfaces:
    m.node_tree.links.new(previous,output.inputs['Surface'])
    m.node_tree.nodes.remove(emission)
target(normal)
scene.render.bake.normal_space = 'TANGENT'
scene.render.bake.normal_r, scene.render.bake.normal_g, scene.render.bake.normal_b = 'POS_X', 'POS_Y', 'POS_Z'
bpy.ops.object.bake(type='NORMAL')
textures = []
for image, role, filename in [(base,'baseColor','wall-master-basecolor.png'), (normal,'normal','wall-master-normal.png')]:
    image.filepath_raw = str(ASSETS/filename)
    image.file_format = 'PNG'
    image.save()
    image.pack()
    textures.append({'file':filename,'role':role,'size':[SIZE,SIZE],
                     'colorSpace':image.colorspace_settings.name,'embedded':True,
                     'sha256':hashlib.sha256((ASSETS/filename).read_bytes()).hexdigest()})
material_records = []
for m in materials:
    old = m.node_tree.nodes.get('Principled BSDF')
    roughness = old.inputs['Roughness'].default_value
    metallic = old.inputs['Metallic'].default_value
    material_records.append({'name':m.name,'roughness':roughness,'metallic':metallic})
    # Replace only this temporary working scene's procedural nodes with core
    # glTF metallic/roughness PBR. No generator or original .blend writes.
    m.node_tree.nodes.clear()
    nodes, links = m.node_tree.nodes, m.node_tree.links
    output = nodes.new('ShaderNodeOutputMaterial')
    p = nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    color_tex = nodes.new('ShaderNodeTexImage'); color_tex.image = base
    normal_tex = nodes.new('ShaderNodeTexImage'); normal_tex.image = normal
    normal_node = nodes.new('ShaderNodeNormalMap'); normal_node.space = 'TANGENT'
    links.new(color_tex.outputs['Color'], p.inputs['Base Color'])
    links.new(normal_tex.outputs['Color'], normal_node.inputs['Color'])
    links.new(normal_node.outputs['Normal'], p.inputs['Normal'])
    links.new(p.outputs['BSDF'], output.inputs['Surface'])
root = bpy.data.objects.new('Fort Custer / pallet wall master', None)
scene.collection.objects.link(root)
root['units'] = '1 glTF metre = 1 logical cell; source Blender +Z up'
root['forward'] = 'Blender -Y; glTF +Z; increasing maze row'
root['approval'] = 'Issue 51 wall master / owner and independent QA pending'
model.parent = root
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True); root.select_set(True)
options = dict(export_format='GLB', use_selection=True, export_yup=True,
               export_normals=True, export_tangents=True, export_texcoords=True,
               export_materials='EXPORT', export_cameras=False, export_lights=False,
               export_animations=False, export_extras=True, export_apply=False)
path = ASSETS/'wall-master.glb'
bpy.ops.export_scene.gltf(filepath=str(path), **options)
# Blender 4.3 rounds MikkTSpace tangent components to four decimals. Restore
# unit/orthogonal tangent frames in the existing binary accessors; preserve
# handedness, all normals, UVs and positions. No new buffers or dependencies.
payload = bytearray(path.read_bytes())
json_length = struct.unpack_from('<I',payload,12)[0]
gltf = json.loads(payload[20:20+json_length])
binary_offset = 28+json_length
def attribute(index, count):
    a = gltf['accessors'][index]; view = gltf['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126
    return np.ndarray((a['count'],count),dtype='<f4',buffer=payload,
                      offset=binary_offset+view.get('byteOffset',0)+a.get('byteOffset',0),
                      strides=(view.get('byteStride',4*count),4))
for primitive in gltf['meshes'][0]['primitives']:
    normal_values = attribute(primitive['attributes']['NORMAL'],3)
    tangent_values = attribute(primitive['attributes']['TANGENT'],4)
    orthogonal = tangent_values[:,:3]-(tangent_values[:,:3]*normal_values).sum(axis=1,keepdims=True)*normal_values
    tangent_values[:,:3] = orthogonal/np.linalg.norm(orthogonal,axis=1,keepdims=True)
path.write_bytes(payload)
record = {'file':path.name,'format':'glTF 2.0 GLB','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
          'bytes':path.stat().st_size,'blender':bpy.app.version_string,'exportOptions':options,
          'tangentFinishing':'Float32 unit/orthogonal frames restored after Blender four-decimal tangent export; handedness unchanged',
          'sourceBlendSha256':hashlib.sha256((ROOT/'source/wall-master.blend').read_bytes()).hexdigest(),
          'sourceComponents':len(source),'triangles':len(model.data.polygons),'verticesBeforeGltfSplits':len(model.data.vertices),
          'textures':textures,'materials':material_records,
          'coordinates':{'cellUnits':1,'source':'Right handed Blender +X right, -Y forward/increasing row, +Z up',
                         'glTF':'Right handed +X right, +Z forward/increasing row, +Y up',
                         'conversion':'(X,Y,Z) Blender → (X,Z,-Y) glTF',
                         'rootPivot':[0,0,0],'rootScale':[1,1,1],
                         'sourceBounds':[[-.5,.5],[-.5,.5],[0,.595]],
                         'glTFBounds':[[-.5,.5],[0,.595],[-.5,.5]]},
          'materialTreatment':{'bake':'1024² shared UV atlas; actual Principled Base Color via temporary EMIT surface (no lighting/AO), tangent-space NORMAL; 16 fixed samples, seed 30, 4px margin',
                               'retained':'Original roughness/metallic scalar per material; evaluated bevel geometry and split/weighted normals',
                               'losses':['Procedural grain becomes finite-resolution 8-bit textures; very fine detail/filtering can differ at close range.',
                                         'Blender shader graphs and editable modifiers are retained only in the original .blend.',
                                         'Core glTF metallic/roughness shading omits Blender-specific default specular-IOR treatment; render engines may differ.'],
                               'unbaked':'No directional lighting, cast shadows, AO, studio background, camera or AgX grade in PBR maps'},
          'license':'Original procedural geometry under repository contribution terms; reference concepts are not used as model textures.',
          'rebuild':'blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/export-glb.py'}
(ROOT/'evidence/glb-export.json').write_text(json.dumps(record,indent=2)+'\n')
print('PASS: wall-only GLB exported with embedded PBR atlas')
