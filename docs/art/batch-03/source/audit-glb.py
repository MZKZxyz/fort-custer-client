"""Raw GLB checks, fresh isolated imports, source geometry/normals and renders."""
import hashlib
import json
import math
import struct
import sys
import tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, WALL, IDENTITIES, verify_inputs, geometry_digest
from render import frame, set_mood
import bpy
import numpy as np
from mathutils import Vector, Matrix, kdtree


def profile(objects):
    dg=bpy.context.evaluated_depsgraph_get();positions=[];corners=[];area=0.;volume=0.;triangles=0
    for obj in objects:
        evaluated=obj.evaluated_get(dg);mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=dg)
        mesh.calc_loop_triangles();matrix=obj.matrix_world;normal_matrix=matrix.to_3x3().inverted().transposed()
        positions.extend(matrix@v.co for v in mesh.vertices)
        for loop in mesh.loops:
            corners.append((matrix@mesh.vertices[loop.vertex_index].co,(normal_matrix@mesh.corner_normals[loop.index].vector).normalized()))
        for tri in mesh.loop_triangles:
            a,b,c=[matrix@mesh.vertices[i].co for i in tri.vertices]
            area+=(b-a).cross(c-a).length/2;volume+=a.dot(b.cross(c))/6;triangles+=1
        evaluated.to_mesh_clear()
    return {'positions':positions,'corners':corners,'area':area,'volume':volume,'triangles':triangles,
            'bounds':[[min(p[i] for p in positions),max(p[i] for p in positions)] for i in range(3)]}


def pictures(folder,prefix,world):
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.seed=30
    s.cycles.use_adaptive_sampling=False;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=2
    s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
    s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
    bpy.ops.object.camera_add();s.camera=bpy.context.object
    for name in ['key','fill']:
        spec=WALL['lighting']['daylight'][name]
        d=bpy.data.lights.new('Locked camera-left key' if name=='key' else 'Locked sky fill','AREA')
        d.shape='DISK';d.size=spec['size'];o=bpy.data.objects.new('QA '+name,d);s.collection.objects.link(o)
        o.location=spec['position'];o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    s.world=bpy.data.worlds.new('Matched source world');s.world.use_nodes=True
    bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=world['color'];bg.inputs['Strength'].default_value=world['strength']
    for mood in ['daylight','dusk']:
        frame(s);set_mood(s,mood)
        s.render.filepath=str(folder/'evidence'/f'{prefix}-{mood}.png');bpy.ops.render.render(write_still=True)


def portrait(folder,prefix,root):
    s=bpy.context.scene;set_mood(s,'daylight');root.rotation_euler.z=math.radians(-14)
    d=bpy.data.lights.new('Portrait-only softbox','AREA');d.energy=110;d.size=3;d.shape='DISK'
    o=bpy.data.objects.new('Portrait-only softbox',d);s.collection.objects.link(o);o.location=(0,-3,1.6)
    o.rotation_euler=(Vector((0,0,.95))-o.location).to_track_quat('-Z','Y').to_euler()
    c=s.camera;s.render.resolution_x=s.render.resolution_y=640;c.data.ortho_scale=.6
    c.location=(0,-4,1.45);target=Vector((0,0,1.08));c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=str(folder/'evidence'/f'{prefix}-face.png');bpy.ops.render.render(write_still=True)


verify_inputs()
targets=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['boy','girl']
for character in targets:
    folder=ROOT/'characters'/character;path=folder/'assets/character-master.glb'
    model=json.loads((folder/'evidence/glb-export.json').read_text());source=json.loads((folder/'assets/source.json').read_text())
    data=path.read_bytes();magic,version,length=struct.unpack_from('<4sII',data)
    assert magic==b'glTF' and version==2 and length==len(data)
    n,kind=struct.unpack_from('<I4s',data,12);assert kind==b'JSON'
    gltf=json.loads(data[20:20+n]);bsize,kind=struct.unpack_from('<I4s',data,20+n);assert kind==b'BIN\0'
    binary=data[28+n:28+n+bsize]
    assert not gltf.get('cameras') and not gltf.get('animations') and not gltf.get('skins')
    assert 'KHR_lights_punctual' not in gltf.get('extensionsUsed',[])
    assert len(gltf['nodes'])==2 and len(gltf['meshes'])==1
    assert len(gltf['buffers'])==1 and 'uri' not in gltf['buffers'][0]
    embedded=[]
    for img in gltf['images']:
        assert img['mimeType']=='image/png' and 'uri' not in img
        view=gltf['bufferViews'][img['bufferView']];start=view.get('byteOffset',0);png=binary[start:start+view['byteLength']]
        digest=hashlib.sha256(png).hexdigest();assert digest in {t['sha256'] for t in model['textures']}
        assert png[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack_from('>II',png,16)==(1024,1024)
        embedded.append({'sha256':digest,'size':[1024,1024],'bytes':len(png)})
    assert len(embedded)==2
    for mat in gltf['materials']:
        pbr=mat['pbrMetallicRoughness'];assert 'baseColorTexture' in pbr and 'normalTexture' in mat
        original=next(m for m in model['materials'] if m['name']==mat['name'])
        assert abs(pbr.get('roughnessFactor',1)-original['roughness'])<1e-6
        assert abs(pbr.get('metallicFactor',1)-original['metallic'])<1e-6
    def accessor(index):
        a=gltf['accessors'][index];v=gltf['bufferViews'][a['bufferView']]
        assert a['componentType']==5126 and 'sparse' not in a
        width={'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        return np.ndarray((a['count'],width),dtype='<f4',buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',4*width),4)).copy()
    for primitive in gltf['meshes'][0]['primitives']:
        attrs=primitive['attributes'];assert all(k in attrs for k in ['POSITION','NORMAL','TANGENT','TEXCOORD_0'])
        pos,normal,tangent,uv=[accessor(attrs[k]) for k in ['POSITION','NORMAL','TANGENT','TEXCOORD_0']]
        for a in [pos,normal,tangent,uv]:assert np.isfinite(a).all()
        assert np.max(np.abs(np.linalg.norm(normal,axis=1)-1))<1e-5
        assert np.max(np.abs(np.linalg.norm(tangent[:,:3],axis=1)-1))<1e-5
        assert np.max(np.abs((normal*tangent[:,:3]).sum(axis=1)))<1e-5
        assert uv.min()>=-1e-6 and uv.max()<=1+1e-6
    bpy.ops.wm.open_mainfile(filepath=str(folder/'source/character-master.blend'))
    objects=[o for o in bpy.context.scene.objects if o.get('role')=='character-master']
    assert geometry_digest(objects)==source['geometrySha256']
    expected=profile(objects)
    world=bpy.context.scene.world.node_tree.nodes.get('Background');world={'color':list(world.inputs['Color'].default_value),'strength':world.inputs['Strength'].default_value}
    for o in list(bpy.context.scene.objects):
        if o not in objects and o.type!='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
    pictures(folder,'source-check',world)
    portrait(folder,'source-check',bpy.data.objects[IDENTITIES[character]])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assert len(bpy.data.objects)==0 and len(bpy.data.images)==0
    with tempfile.TemporaryDirectory(prefix='fort-custer-character-') as tmp:
        isolated=Path(tmp)/'character.glb';isolated.write_bytes(data);bpy.ops.import_scene.gltf(filepath=str(isolated))
        imported=list(bpy.context.scene.objects);assert sorted(o.type for o in imported)==['EMPTY','MESH']
        mesh=next(o for o in imported if o.type=='MESH');root=next(o for o in imported if o.type=='EMPTY')
        assert mesh.parent==root
        for o in imported:assert max(abs(o.matrix_world[i][j]-Matrix.Identity(4)[i][j]) for i in range(4) for j in range(4))<1e-6
        assert len(bpy.data.images)==2 and all(i.packed_file for i in bpy.data.images)
        actual=profile([mesh]);assert actual['triangles']==expected['triangles']
        assert np.max(np.abs(np.array(actual['bounds'])-np.array(expected['bounds'])))<1e-6
        assert abs(actual['area']-expected['area'])<1e-5
        assert abs(actual['volume']-expected['volume'])<1e-6
        tree=kdtree.KDTree(len(expected['corners']))
        for i,(p,norm) in enumerate(expected['corners']):tree.insert(p,i)
        tree.balance();max_error=0.;min_dot=1.
        for p,norm in actual['corners']:
            matches=tree.find_range(p,2e-6);assert matches
            max_error=max(max_error,min(m[2] for m in matches))
            min_dot=min(min_dot,max(norm.dot(expected['corners'][idx][1]) for _,idx,_ in matches))
        assert min_dot>.99999,min_dot
        reverse=kdtree.KDTree(len(actual['positions']))
        for i,p in enumerate(actual['positions']):reverse.insert(p,i)
        reverse.balance();reverse_error=max(reverse.find(p)[2] for p in expected['positions']);assert reverse_error<2e-6
        report={'status':'PASS','characterId':IDENTITIES[character],'glbSha256':hashlib.sha256(data).hexdigest(),
                'cleanImport':{'sourceBlendLoaded':False,'filesInDirectory':['character.glb'],'objects':['EMPTY','MESH'],
                               'embeddedPackedImages':2,'lights':0,'cameras':0},
                'worldBounds':actual['bounds'],'triangles':actual['triangles'],'materialGroups':len(gltf['materials']),
                'rootPivot':[0,0,0],'rootScale':[1,1,1],'maxPositionError':max_error,'reversePositionError':reverse_error,
                'minimumSourceNormalDot':min_dot,'surfaceAreaDelta':abs(actual['area']-expected['area']),
                'signedVolumeDelta':abs(actual['volume']-expected['volume']),'embeddedTextures':embedded,
                'qaWorld':world,'sourceReferences':'Source geometry used for comparison only; factory reset before isolated import',
                'limits':'Author checks only; PBR atlas/shader/filtering losses and future retopology/LOD/rigging remain.'}
        pictures(folder,'reimport-check',world)
        portrait(folder,'reimport-check',root)
        (folder/'evidence/glb-reimport.json').write_text(json.dumps(report,indent=2)+'\n')
    print('CHARACTER_CLEAN_GLB_PASS',character,flush=True)
