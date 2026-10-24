"""Optional local iteration shortcut, not required for full reproduction.
Load the temporary v2 authoring cache; regenerate X from authoritative render.py,
then execute that source's render setup/loop. Full render.py builds the same scene.
"""
import ast,bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'source/render.py').read_text();tree=ast.parse(source)
for node in tree.body:
 if isinstance(node,ast.FunctionDef) and node.name in ['box','ball','cyl','rod']:
  exec(compile(ast.Module(body=[node],type_ignores=[]),'<source factory>','exec'))
for name in ['red','cream','brass','boot']:
 globals()[name]=bpy.data.materials[{'red':'Extinguisher / oxide red','cream':'Unbleached canvas','brass':'Worn brass','boot':'Boots and hose'}[name]]
prefixes=['Extinguisher body','Rounded shoulder','Cream body label','Broad squeeze lever','Lever neck','Looped hose','Flared nozzle']
for o in list(bpy.data.objects):
 if any(o.name.startswith(p)for p in prefixes):bpy.data.objects.remove(o,do_unlink=True)
x,y=-2,-2
for node in ast.walk(tree):
 if isinstance(node,ast.If) and isinstance(node.test,ast.Compare) and isinstance(node.test.left,ast.Name) and node.test.left.id=='t' and any(isinstance(c,ast.Constant) and c.value=='X' for c in node.test.comparators):
  exec(compile(ast.Module(body=node.body,type_ignores=[]),'<source extinguisher>','exec'))
key=bpy.data.objects['Camera-left softbox'];fill=bpy.data.objects['Sky fill'];back=bpy.data.materials['Studio backdrop']
practicals=[o.data for o in bpy.data.objects if o.name.startswith('Warm practical')]
exec(source[source.index('bpy.ops.object.camera_add('):])
