"""Reopen private Blender masters; factory-reset import self-contained GLBs."""
import argparse,hashlib,json,sys,tempfile,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
from render import ROOT,bounds,setup,mood,frame,render
p=argparse.ArgumentParser();p.add_argument('--private-output',required=True,type=Path);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);records=[]
for identity in ['source-1','source-2']:
    folder=a.private_output/identity;expected=json.loads((ROOT/'evidence'/f'{identity}-sprites.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=str(folder/'normalized.blend'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bb=bounds(meshes)
    assert abs(bb[2][0])<1e-5 and abs(bb[2][1]-1.15)<1e-5
    assert all(im.packed_file for im in bpy.data.images)
    assert not bpy.data.actions and not any(o.type=='ARMATURE' for o in bpy.context.scene.objects)
    with tempfile.TemporaryDirectory() as temp:
        local=Path(temp)/'only.glb';shutil.copyfile(folder/'normalized.glb',local)
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(local));bpy.context.view_layer.update()
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bb=bounds(objects);triangles=0
        for o in objects:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
        assert triangles==expected['triangles']
        error=max(abs(bb[i][j]-expected['normalizedBounds'][i][j]) for i in range(3) for j in range(2));assert error<1e-5
        assert all(o.data.uv_layers for o in objects)
        s,receiver=setup();mood(s,'daylight');frame(s,256,352,[128,208]);render(s,ROOT/'evidence'/f'{identity}-reimport-daylight.png')
        records.append({'id':identity,'triangleCount':triangles,'bounds':bb,'maxBoundsError':error,'packedBlendReopened':True,'glbOnlyDirectoryImport':True,'uvPresent':True,'embeddedTextureImages':sum(im.type=='IMAGE' for im in bpy.data.images),'externalFilesRequired':False})
(ROOT/'evidence/normalized-audit.json').write_text(json.dumps(records,indent=2)+'\n')
