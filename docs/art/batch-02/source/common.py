"""Pinned Batch 01 reuse without writing to its approved directory."""
import ast
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
BASE = ROOT.parent/'batch-01'
PINS = json.loads((ROOT/'source/approved-inputs.json').read_text())
APPROVED = json.loads((BASE/'assets/manifest.json').read_text())
IDS = ['v01','v02','v03','v04']
NAMES = {'v01':'Approved honey','v02':'Naturally aged / repair tone',
         'v03':'Dark weathered / iron patina','v04':'Sun-bleached / worn timber'}


def verify_inputs():
    for relative, expected in PINS['files'].items():
        assert hashlib.sha256((REPO/relative).read_bytes()).hexdigest() == expected, relative


def geometry_hash(objects):
    payload = [(o.name,[list(row) for row in o.matrix_world],
                [list(v.co) for v in o.data.vertices],
                [list(p.vertices) for p in o.data.polygons]) for o in sorted(objects,key=lambda o:o.name)]
    return hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()


def run_approved(script, variant):
    """Rebase only ROOT/approval metadata in a pinned, unchanged upstream AST.
    All bake, normal preservation, binary export and clean import code runs
    verbatim. Per-variant paths contain the same source/assets/evidence layout.
    """
    verify_inputs()
    path = BASE/'source'/script
    destination = ROOT/'variants'/variant
    tree = ast.parse(path.read_text())
    count = 0
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ROOT' for t in node.targets):
            node.value = ast.Call(func=ast.Name(id='Path',ctx=ast.Load()),args=[ast.Constant(str(destination))],keywords=[])
            count += 1
        if isinstance(node,ast.Assign) and any(ast.unparse(t)=="root['approval']" for t in node.targets):
            node.value = ast.Constant('Issue 55 '+variant+' / proposed appearance / owner approval pending')
    assert count == 1, script
    for i,node in enumerate(tree.body):
        if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and ast.unparse(node.value.func)=='bpy.ops.export_scene.gltf':
            tree.body.insert(i,ast.parse(f"root['variantId'] = {variant!r}").body[0])
            break
    ast.fix_missing_locations(tree)
    exec(compile(tree,str(path),'exec'),{'__file__':str(path),'__name__':'__main__'})


def record_file(path):
    return {'file':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def glb_geometry_signature(path):
    """Compare actual vertex/UV/tangent/index payloads independently of textures."""
    import numpy as np
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    gltf=json.loads(data[20:20+length]);binary=data[28+length:]
    digest=hashlib.sha256()
    for primitive in gltf['meshes'][0]['primitives']:
        fields={**primitive['attributes'],'indices':primitive['indices']}
        for name,index in sorted(fields.items()):
            a=gltf['accessors'][index];view=gltf['bufferViews'][a['bufferView']]
            width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
            dtype=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']])
            array=np.ndarray((a['count'],width),dtype=dtype,buffer=binary,
                             offset=view.get('byteOffset',0)+a.get('byteOffset',0),
                             strides=(view.get('byteStride',dtype.itemsize*width),dtype.itemsize))
            digest.update(json.dumps([name,a['componentType'],a['type'],a['count']]).encode())
            digest.update(array.tobytes())
    return digest.hexdigest()
