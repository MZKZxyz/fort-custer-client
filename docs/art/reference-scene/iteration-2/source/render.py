"""FC-VIS-01 focused second pass; original source remains ../../source/render.py. Blender 4.3+, no external assets.
Run: blender -b --python docs/art/reference-scene/iteration-2/source/render.py
This is authoring geometry, never runtime gameplay or a production asset pack.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
random.seed(30)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

GRID = [
    '#########',
    '#   #  E#',
    '# # # # #',
    '# #   # #',
    '# ### # #',
    '#   F   #',
    '### ### #',
    '# X #   #',
    '# # # ###',
    '# S     #',
    '#########',
]
(ROOT / 'source/fixture.json').write_text(json.dumps({'grid':GRID,'player':[9,2], 'cell_unit':1, 'purpose':'authored static art fixture; not a published maze'}, indent=2)+'\n')

def mat(name, color, rough=0.85, grain=False, emit=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=m.node_tree.nodes; p=n.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough
    if emit: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emit
    if grain:
        noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=38; noise.inputs['Detail'].default_value=2
        bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.18; bump.inputs['Distance'].default_value=.035
        m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    return m
wood=[mat('Pallet / honey %s'%i,c,grain=True) for i,c in enumerate([(.43,.25,.105),(.55,.34,.16),(.64,.42,.22),(.48,.30,.14)])]
end=mat('Fresh end grain',(.71,.50,.28),grain=True); dark=mat('Recess soil',(.19,.14,.085),grain=True)
earth=mat('Prairie loam',(.42,.33,.19),grain=True); path=mat('Compacted ochre',(.68,.53,.32),grain=True)
edge=mat('Cut earth edge',(.26,.19,.11),grain=True); grass=[mat('Sage',(.32,.37,.16)),mat('Straw',(.53,.48,.23)),mat('Olive',(.24,.29,.12))]
flower=mat('Prairie violet',(.52,.37,.61)); cream=mat('Unbleached canvas',(.87,.76,.54),grain=True)
blue=mat('Explorer / indigo clay',(.11,.29,.39),grain=True); skin=mat('Explorer / terracotta',(.67,.38,.22)); hat=mat('Hat / ochre felt',(.69,.46,.19),grain=True)
boot=mat('Boots and hose',(.075,.065,.045)); red=mat('Extinguisher / oxide red',(.69,.075,.035)); brass=mat('Worn brass',(.50,.36,.13),rough=.5)
orange=mat('Fire / outer clay',(.98,.20,.025),emit=.35); yellow=mat('Fire / inner clay',(1,.63,.08),emit=.5)
ink=mat('Sign ink',(.10,.15,.14)); glow=mat('Lantern glass',(1,.57,.14),emit=3)

def box(name,loc,scale,material,bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Soft handmade edges','BEVEL'); m.width=bevel; m.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def ball(name,loc,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(name,loc,r,depth,material,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); o=bpy.context.object; o.name=name;o.data.materials.append(material)
    m=o.modifiers.new('Rounded edge','BEVEL');m.width=.018;m.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def rod(name,a,b,r,material):
    v=Vector(b)-Vector(a);o=cyl(name,(Vector(a)+Vector(b))/2,r,v.length,material,12);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def xy(r,c):return c-4,5-r
def text(body,loc,size,material,rotation=(0,0,0)):
    cu=bpy.data.curves.new('Letter '+body,'FONT');cu.body=body;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=size;cu.extrude=.001
    o=bpy.data.objects.new('Marker '+body,cu);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rotation;o.data.materials.append(material);return o
def badge(letter,x,y):
    pass # Badge-free art masters; semantic cues are optional concept-page overlays.

# A quiet physical tabletop, with one continuous footprint beneath every wall.
box('Diorama cut soil',(0,0,-.25),(10.15,12.15,.5),edge,.12)
box('Prairie surface',(0,0,-.025),(10.1,12.1,.12),earth,.08)
for r,row in enumerate(GRID):
    for c,t in enumerate(row):
        x,y=xy(r,c)
        if t!='#':box('Walkable / %s,%s'%(r,c),(x,y,.026),(1,1,.055),path,.015)
        else:
            box('Blocked continuous footprint / %s,%s'%(r,c),(x,y,.04),(1,1,.08),dark,.008)
            # Four slatted faces with a genuinely empty top and visible inner well.
            for z in [.16,.32,.48]:
                for dy in [-.447,.447]:box('Horizontal pallet slat',(x,y+dy,z),(.98,.106,.135),random.choice(wood),.012)
                for dx in [-.447,.447]:box('Horizontal pallet slat',(x+dx,y,z),(.106,.78,.135),random.choice(wood),.012)
            for dx in [-.436,.436]:
                for dy in [-.436,.436]:box('Corner upright',(x+dx,y+dy,.30),(.115,.115,.59),end,.012)
            # Thin dark nail heads, confined to wood, never passage markers.
            for dx in [-.37,.37]:
                ball('Iron peg',(x+dx,y-.505,.46),(.017,.009,.017),boot)
        if t=='X':
            # A leaning toy cylinder exposes its length at both elevations.
            rod('Extinguisher body',(x-.10,y-.12,.16),(x-.10,y+.17,.65),.155,red)
            ball('Rounded shoulder',(x-.10,y+.17,.65),(.15,.14,.075),red)
            box('Cream body label',(x-.10,y-.02,.43),(.22,.025,.23),cream,.01)
            box('Broad squeeze lever',(x-.04,y+.18,.77),(.34,.09,.06),brass,.012)
            rod('Lever neck',(x-.10,y+.17,.64),(x-.10,y+.18,.76),.045,boot)
            for a,b in [((.03,.17,.66),(.24,.20,.69)),((.24,.20,.69),(.33,.02,.43)),((.33,.02,.43),(.29,-.12,.37))]:
                rod('Looped hose',(x+a[0],y+a[1],a[2]),(x+b[0],y+b[1],b[2]),.035,boot)
            rod('Flared nozzle',(x+.29,y-.12,.37),(x+.22,y-.21,.34),.052,boot)
        if t=='F':
            for a in [-.7,.7]:
                o=box('Charred log',(x,y,.11),(.68,.13,.13),boot,.025);o.rotation_euler.z=a
            def flame(name,dx,dy,h,radius,material):
                verts=[];faces=[]
                for zz,rr in [(0,.7),(.25,1),(.55,.68),(.8,.32),(1,0)]:
                    for i in range(12):
                        angle=i*math.tau/12
                        verts.append((x+dx+radius*rr*math.cos(angle)+.055*zz**2,y+dy+radius*rr*math.sin(angle)+.16*zz**2,.10+h*zz))
                for j in range(4):
                    for i in range(12):faces.append((j*12+i,j*12+(i+1)%12,(j+1)*12+(i+1)%12,(j+1)*12+i))
                mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces)
                o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material)
                for face in mesh.polygons:face.use_smooth=True
            for dx,dy,h in [(-.23,0,.68),(.20,.025,.79),(0,.06,1.02)]:flame('Raised orange tongue',dx,dy,h,.13,orange)
            flame('Pointed golden core',-.015,-.135,.61,.105,yellow)
        if t=='E':
            # Neutral fictional canvas A-frame, not a culturally attributed dwelling.
            verts=[(x-.40,y-.33,.06),(x+.40,y-.33,.06),(x,y-.33,1.02),(x-.40,y+.31,.06),(x+.40,y+.31,.06),(x,y+.31,1.02)]
            mesh=bpy.data.meshes.new('A-frame canvas');mesh.from_pydata(verts,[],[(0,2,5,3),(2,1,4,5),(3,5,4)])
            o=bpy.data.objects.new('Provisional canvas goal',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cream)
            # Front panels leave a real triangular entrance; dark interior is visible.
            door=[(x-.40,y-.335,.06),(x-.17,y-.335,.06),(x,y-.335,.56),(x+.17,y-.335,.06),(x+.40,y-.335,.06),(x,y-.335,1.02)]
            mesh=bpy.data.meshes.new('Open entrance panels');mesh.from_pydata(door,[],[(0,1,2,5),(2,3,4,5)])
            o=bpy.data.objects.new('Canvas entrance sides',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cream)
            box('Dark entry mat',(x,y-.30,.065),(.35,.38,.025),boot,.008)
            rod('Ridge pole',(x,y-.37,1.04),(x,y+.35,1.04),.025,wood[0])
            for dx in [-.40,.40]:rod('Front frame',(x+dx,y-.34,.07),(x,y-.34,1.03),.021,wood[0])

# Exaggerated clay explorer: visible coat, separated boots, arms and forward face.
x,y=xy(9,2)
for dx in [-.145,.145]:ball('Separated boot',(x+dx,y-.04,.14),(.11,.20,.10),boot)
ball('Indigo coat',(x,y-.07,.48),(.255,.205,.32),blue)
ball('Backpack',(x,y+.18,.52),(.19,.09,.22),wood[1])
for dx in [-.29,.29]:
    rod('Outward sleeve',(x+dx*.65,y-.07,.64),(x+dx,y-.16,.37),.09,blue)
    ball('Clay hand',(x+dx,y-.18,.33),(.075,.075,.08),skin)
ball('Visible face',(x,y-.18,.87),(.145,.13,.16),skin)
ball('Nose',(x,y-.305,.87),(.045,.045,.04),skin)
ball('Neckerchief',(x,y-.265,.68),(.145,.04,.06),red)
# A narrower hat sits behind the face; the body is wider than the brim.
ball('Hat brim',(x,y+.015,1.035),(.24,.185,.035),hat)
ball('Hat crown',(x,y+.055,1.105),(.135,.12,.09),hat)

# Edge ecology only. Nothing decorates the center of walkable cells.
for i in range(300):
    side=random.randrange(4)
    if side<2:x=random.uniform(-4.9,4.9);y=random.choice([-1,1])*random.uniform(5.55,5.9)
    else:x=random.choice([-1,1])*random.uniform(4.55,4.9);y=random.uniform(-5.6,5.6)
    h=random.uniform(.10,.28);g=random.choice(grass)
    for j in range(3):rod('Prairie blade',(x,y,.035),(x+random.uniform(-.07,.07),y+random.uniform(-.06,.06),h),.009,g)
    if i%7==0:
        for a in range(5):ball('Violet petal',(x+.035*math.cos(a*math.tau/5),y+.035*math.sin(a*math.tau/5),h),(.035,.025,.018),flower)
        ball('Flower heart',(x,y,h+.01),(.015,.015,.015),yellow)
for i in range(65):
    x=random.uniform(-4.9,4.9);y=random.choice([-1,1])*random.uniform(5.6,5.95);ball('Edge pebble',(x,y,.04),(.045,.065,.03),cream)

lanterns=[]
for x,y in [(-4.8,-3.1),(4.8,2.8),(-2.5,5.75)]:
    rod('Lantern post',(x,y,0),(x,y,.88),.035,wood[0]);rod('Lantern arm',(x,y,.88),(x+.18,y,.88),.025,wood[0])
    cyl('Lantern cap',(x+.18,y,.72),.095,.05,boot);cyl('Lantern foot',(x+.18,y,.49),.09,.04,boot);cyl('Lantern glass',(x+.18,y,.60),.065,.18,glow)
    for dx in [-.065,.065]:rod('Lantern frame',(x+.18+dx,y,.49),(x+.18+dx,y,.72),.009,boot)
    lanterns.append((x+.18,y,.62))

# Small optional fiction plaque outside the maze; it cannot be a passage cue.
box('Perimeter plaque',(0,-5.82,.08),(1.55,.28,.09),wood[0],.03)
text('KEARNY  /  FIELD No. 01',(0,-5.82,.13),.105,cream)

back=mat('Studio backdrop',(.13,.18,.16));box('Studio',(0,0,-.58),(200,200,.15),back,.0)
def area(name,loc,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();return o
key=area('Camera-left softbox',(-6,-3,12),1800,(1,.84,.63),7)
fill=area('Sky fill',(4,6,10),650,(.66,.79,1),9)
practicals=[]
for pos in lanterns:
    d=bpy.data.lights.new('Warm practical','POINT');d.energy=0;d.color=(1,.47,.13);d.shadow_soft_size=.45;o=bpy.data.objects.new('Warm practical',d);bpy.context.collection.objects.link(o);o.location=pos;practicals.append(d)

bpy.ops.object.camera_add(location=(0,-8.5,23.5));camera=bpy.context.object
camera.data.type='ORTHO';camera.data.ortho_scale=14.3;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
# Match the two-CPU quota instead of oversubscribing the host's many visible CPUs.
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=94
scene.render.film_transparent=False
# A temporary authoring cache allows rerendering without rebuilding thousands of objects.
bpy.ops.wm.save_as_mainfile(filepath='/tmp/fort-custer-iteration-2.blend')
for elevation in [70.1,58.0]:
    angle=math.radians(elevation);camera.location=(0,-25*math.cos(angle),25*math.sin(angle))
    camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler()
    for mood in ['daylight','dusk']:
        day=mood=='daylight'
        key.data.energy=1800 if day else 1000;key.data.color=(1,.84,.63) if day else (.57,.68,1)
        fill.data.energy=650 if day else 550;fill.data.color=(.66,.79,1) if day else (.45,.54,1)
        scene.world.color=(.25,.25,.25) if day else (.15,.18,.25)
        for d in practicals:d.energy=0 if day else 28
        back.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*((.13,.18,.16) if day else (.055,.085,.13)),1)
        scene.render.filepath=str(ROOT/'renders'/f'angle-{elevation:g}-{mood}.jpg');bpy.ops.render.render(write_still=True)
print('FC_VIS_01_ITERATION_2_COMPLETE')
