"""Original parametric character sculpture from the supplied 2D references.
Independent editable components, neutral stance, no skeleton/animation.
"""
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, BASE, IDENTITIES, verify_inputs, geometry_digest
import bpy
from mathutils import Vector, Matrix


def material(name,color,rough=.75,grain=False,metallic=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metallic
    if grain:
        nodes,links=m.node_tree.nodes,m.node_tree.links
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=45;noise.inputs['Detail'].default_value=2
        ramp=nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color=tuple(c*.84 for c in color)+(1,)
        ramp.color_ramp.elements[1].color=tuple(min(1,c*1.08) for c in color)+(1,)
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.003
        links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],p.inputs['Base Color'])
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
    return m


def mesh(name,vertices,faces,mat,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return obj


def ball(name,loc,scale,mat,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.data.materials.append(mat)
    for p in obj.data.polygons:p.use_smooth=True
    return obj


def box(name,loc,scale,mat,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);obj=bpy.context.object;obj.name=name;obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Rounded tailored edge','BEVEL');mod.width=bevel;mod.segments=2
        obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return obj


def tube(name,points,radius,mat,sides=8,cyclic=False,flatten=1):
    """Swept mesh, not an unsupported curve in the portable asset."""
    points=[Vector(p) for p in points];vertices=[]
    radii=radius if isinstance(radius,list) else [radius]*len(points)
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        axis=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
        u=tangent.cross(axis).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):vertices.append(p+radii[i]*(u*math.cos(j*math.tau/sides)+v*flatten*math.sin(j*math.tau/sides)))
    faces=[]
    for i in range(len(points)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vertices,faces,mat)


def loft(name,sections,mat,sides=24,boxiness=1):
    """Sections: center x/y/z, half-width/depth; continuous shaped garment/head."""
    vertices=[];faces=[]
    for x,y,z,rx,ry in sections:
        for j in range(sides):
            c,s=math.cos(j*math.tau/sides),math.sin(j*math.tau/sides)
            vertices.append((x+rx*math.copysign(abs(c)**boxiness,c),y+ry*math.copysign(abs(s)**boxiness,s),z))
    for i in range(len(sections)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(sections)-1)*sides+j for j in range(sides))])
    return mesh(name,vertices,faces,mat)


def ribbon(name,points,width,mat):
    vertices=[]
    for x,y,z in points:
        vertices.extend([(x-width/2,y,z),(x+width/2,y,z),(x-width/2,y+.006,z),(x+width/2,y+.006,z)])
    faces=[]
    for i in range(len(points)-1):
        a,b=i*4,(i+1)*4
        faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,b,a+2+4,a+2),(a+1,a+3,b+3,b+1)])
    last=len(vertices)-4
    faces.extend([(0,2,3,1),(last,last+1,last+3,last+2)])
    if points[-1][2]<points[0][2]:faces=[tuple(reversed(f)) for f in faces]
    return mesh(name,vertices,faces,mat,False)


def buckle(name,x,y,z,width,height,mat):
    p=[(x-width/2,y,z-height/2),(x+width/2,y,z-height/2),(x+width/2,y,z+height/2),
       (x-width/2,y,z+height/2),(x-width/2,y,z-height/2)]
    tube(name,p,.0025,mat,6)


def prepare_components(objects):
    """Centered editable component pivots and a real source UV atlas.
    No geometry/material deformation; Generated-coordinate shaders are retained.
    """
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
        if not o.data.uv_layers:o.data.uv_layers.new(name='Component UV')
        o.data.uv_layers.active.name='Component UV'
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS')
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.1519173,island_margin=.004,margin_method='FRACTION')
    bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()


def build(character):
    verify_inputs();bpy.ops.wm.open_mainfile(filepath=str(BASE/'source/wall-master.blend'))
    for obj in list(bpy.context.scene.objects):
        if obj.get('role')=='wall-master':bpy.data.objects.remove(obj,do_unlink=True)
    # Inherit only the approved render rig/ground catcher; original files untouched.
    before=set(bpy.data.objects);girl=character=='girl';identity=IDENTITIES[character]
    skin=material('Warm skin / freckles',(.60,.30,.17) if not girl else (.66,.35,.22),.70)
    lips=material('Natural closed smile',(.35,.085,.055));freckle=material('Subtle freckles',(.30,.11,.045))
    hair=material('Blonde braided hair' if girl else 'Rust red swept hair',(.63,.36,.095) if girl else (.43,.105,.025),.74,True)
    hair_light=material('Hair ridge highlight',(.76,.47,.14) if girl else (.48,.12,.035),.78)
    shirt=material('Cream field shirt' if girl else 'Blue field shirt',(.72,.65,.48) if girl else (.09,.23,.36),.87,True)
    cuff=material('Rolled fabric cuff',(.82,.75,.58) if girl else (.19,.34,.44),.90,True)
    pants=material('Olive cargo cloth' if girl else 'Tan cargo cloth',(.22,.25,.13) if girl else (.43,.29,.14),.92,True)
    pocket=material('Cargo pocket seams',(.19,.21,.11) if girl else (.36,.23,.105),.90,True)
    scarf=material('Blue gray scarf' if girl else 'Compact reddish neckerchief',(.13,.22,.28) if girl else (.44,.075,.035),.86,True)
    leather=material('Worn brown leather',(.20,.085,.030),.76,True)
    hat=material('Brown felt field hat',(.30,.15,.055),.92,True)
    hatband=material('Dark leather hat band',(.095,.045,.018),.84)
    sole=material('Boot sole / neutral umber',(.055,.035,.020),.92)
    brass=material('Dull brass hardware',(.38,.25,.075),.52,metallic=.6)
    stitch=material('Leather seam / boot lace',(.43,.27,.11),.85)
    bed=material('Canvas bedroll',(.40,.32,.18),.94,True)
    bed_dark=material('Bedroll spiral seam',(.19,.14,.07),.92)
    sclera=material('Visible warm sclera',(.72,.72,.65),.35)
    iris=material('Blue iris' if girl else 'Green iris',(.035,.24,.48) if girl else (.095,.30,.055),.30)
    pupil=material('Visible pupil',(.008,.006,.004),.25)
    eye_glint=material('Eye catchlight',(.95,.96,.94),.25)
    # Long legs, smaller head and restrained hands: teen miniature, no chibi pose.
    hip=.119 if girl else .13;shoulder=.151 if girl else .164
    loft('Cargo pelvis',[(0,0,.53,.041,.045),(0,0,.60,hip,.080),(0,0,.655,.115,.078)],pants,boxiness=.75)
    loft('Tailored field shirt',[(0,0,.646,.120,.080),(0,0,.70,.113,.079),(0,0,.83,.137,.087),
                               (0,0,.95,shoulder,.085),(0,0,.985,shoulder*.88,.072),(0,0,1.018,.055,.047)],shirt,boxiness=.93)
    for sign in [-1,1]:
        x=sign*.09
        loft('Cargo trouser leg',[(x,-.005,.20,.050,.056),(x,-.005,.24,.056,.059),(sign*.084,-.01,.35,.055,.061),
             (sign*.076,0,.48,.060,.065),(sign*.065,0,.60,.068,.070)],pants,boxiness=.76)
        loft('Turned trouser cuff',[(x,-.005,.20,.053,.059),(x,-.005,.228,.057,.063),(x,-.005,.236,.054,.060)],pocket,boxiness=.76)
        box('Outer cargo pocket',(sign*.127,-.01,.43),(.039,.102,.126),pocket,.008)
        box('Cargo pocket flap',(sign*.13,-.01,.485),(.042,.11,.022),pants,.005)
        box('Ground-contact boot sole',(x,-.035,.015),(.120,.236,.030),sole,.009)
        box('Shaped boot toe',(x,-.050,.064),(.112,.194,.091),leather,.025)
        loft('Boot ankle shaft',[(x,.012,.035,.053,.061),(x,.013,.11,.051,.055),(x,.015,.195,.050,.052)],leather,boxiness=.70)
        for j in range(4):
            z=.11+j*.019
            tube('Crossed boot lace',[(x-.035,-.043,z),(x+.032,-.047,z+.014)],.0025,stitch,6)
            tube('Crossed boot lace',[(x+.035,-.044,z),(x-.032,-.047,z+.014)],.0025,stitch,6)
        loft('Rolled shirt sleeve',[(sign*.204,-.008,.785,.048,.050),(sign*.19,0,.85,.053,.054),
                                   (sign*(shoulder-.005),0,.955,.056,.060),
                                   (sign*(shoulder-.013),0,.978,.035,.040),(sign*(shoulder-.021),0,.988,.012,.018)],shirt)
        loft('Folded sleeve hem',[(sign*.205,-.008,.779,.052,.055),(sign*.201,-.006,.813,.055,.058)],cuff)
        loft('Forearm',[(sign*.251,-.035,.575,.025,.024),(sign*.24,-.023,.665,.034,.033),
                        (sign*.207,-.008,.795,.040,.039)],skin)
        ball('Palm',(sign*.255,-.037,.550),(.025,.021,.033),skin)
        for j in range(4):
            xx=sign*(.238+j*.010)
            tube('Relaxed finger',[(xx,-.04,.530),(xx,-.045,.490+abs(j-1.5)*.003)],.0055,skin,8)
        ball('Relaxed thumb',(sign*.232,-.056,.552),(.010,.012,.022),skin,16,10)
    loft('Neck',[(0,0,.99,.043,.041),(0,0,1.07,.046,.043)],skin)
    head_start=set(bpy.data.objects)
    # Distinct facial structures; neither master is a palette swap.
    jaw=.083 if girl else .096;cheek=.112 if girl else .119
    loft('Sculpted face and cranium',[(0,-.005,1.00,.043,.047),(0,-.002,1.026,jaw,.075),
         (0,0,1.072,cheek,.101),(0,.002,1.135,cheek,.114),(0,.005,1.194,.109,.104),
         (0,.008,1.235,.082,.082),(0,.012,1.255,.025,.030)],skin,40)
    for sign in [-1,1]:
        ball('Ear',(sign*.116,.002,1.119),(.018,.017,.034),skin)
        ball('Inner ear',(sign*.128,-.007,1.12),(.008,.007,.020),lips,16,8)
        xx=sign*.046
        ball('Sclera',(xx,-.100,1.143),(.0235,.020,.016),sclera,24,14)
        ball('Colored iris',(xx,-.1198,1.143),(.0110,.0020,.0120),iris,24,14)
        ball('Pupil',(xx,-.1218,1.143),(.0044,.0012,.0058),pupil,20,12)
        ball('Eye catchlight',(xx-.0030,-.1230,1.148),(.0020,.0008,.0020),eye_glint,12,8)
        lid=[(xx+.024*math.cos(t),-.119+.014*abs(math.cos(t)),1.143+.017*math.sin(t)) for t in [i*math.pi/12 for i in range(13)]]
        tube('Upper eyelid',lid,.0038,skin,6)
        lower=[(xx+.023*math.cos(t),-.118+.013*abs(math.cos(t)),1.143-.013*math.sin(t)) for t in [i*math.pi/12 for i in range(13)]]
        tube('Lower eyelid',lower,.0025,skin,6)
        brow=[(xx-.027,-.109,1.178),(xx,-.118,1.184),(xx+.026,-.111,1.178)]
        tube('Expressive brow',brow,[.003,.005,.003],hair,8)
        for j,(dx,dz) in enumerate([(-.014,.003),(-.004,-.004),(.009,.005),(.021,-.003),(.006,-.012)]):
            fx=sign*(.051+dx);fy=-.101*math.sqrt(max(.1,1-(fx/.12)**2))-.002
            ball('Subtle cheek freckle',(fx,fy,1.099+dz),(.0019,.0012,.0017),freckle,8,4)
    ball('Nose bridge',(0,-.114,1.123),(.018,.025,.032),skin)
    ball('Defined nose tip',(0,-.143,1.103),(.022,.020,.014),skin)
    for x in [-.010,.010]:ball('Subtle nostril',(x,-.156,1.096),(.0035,.0025,.002),lips,12,6)
    smile=[(-.034,-.081,1.050),(-.017,-.088,1.045),(0,-.091,1.043),(.017,-.088,1.045),(.034,-.081,1.050)]
    tube('Closed gentle smile',smile,.0026,lips,8)
    tube('Lower lip',[(x,y-.0005,z-.004) for x,y,z in smile[1:-1]],.002,skin,8)
    # Scalp shell: front hairline above eyes, lower at the back/nape.
    verts=[];faces=[]
    for k in range(9):
        t=k/8
        for j in range(40):
            a=j*math.tau/40;front=max(0,-math.sin(a));bottom=(1.035+.16*front) if girl else (1.065+.13*front)
            z=1.255*(1-t)+bottom*t;r=max(.005,math.sin(t*math.pi/2))
            verts.append((.123*r*math.cos(a),.111*r*math.sin(a)+.008,z))
    for k in range(8):
        for j in range(40):faces.append((k*40+j,k*40+(j+1)%40,(k+1)*40+(j+1)%40,(k+1)*40+j))
    faces=[tuple(reversed(f)) for f in faces]
    faces.extend([tuple(range(40)),tuple(reversed(range(8*40,9*40)))])
    mesh('Hair cap',verts,faces,hair)
    for j in range(5):
        x=-.084+j*.038
        def hy(xx,depth):return -depth*math.sqrt(max(.1,1-(xx/.13)**2))
        points=[(x+.012,hy(x+.012,.080),1.218),(x+.005,hy(x+.005,.112),1.192),
                (x-.021,hy(x-.021,.114),1.172 if girl else 1.168)]
        tube('Swept blonde fringe' if girl else 'Swept rust forelock',points,[.014,.017,.002],hair_light if j%3==0 else hair,10,flatten=.38)
    for sign in [-1,1]:
        tube('Temple lock',[(sign*.11,-.018,1.19),(sign*.121,-.01,1.13),(sign*.113,.005,1.07 if girl else 1.08)],
             [.019,.018,.006],hair,10)
    if girl:
        # Three physically interwoven strands, wrapping over the right shoulder.
        centers=[Vector((.075+.10*t,.08-.19*t,1.15-.35*t)) for t in [i/45 for i in range(46)]]
        for strand in range(3):
            points=[];radii=[]
            for i,p in enumerate(centers):
                t=i/(len(centers)-1);phase=math.tau*(4*t+strand/3)
                points.append(p+Vector((.018*math.cos(phase),.013*math.sin(phase),.004*math.sin(phase))))
                radii.append(.0115*(1-.38*t))
            tube('Interwoven blonde braid strand',points,radii,hair_light if strand==0 else hair,8)
        tube('Braid leather tie',[(.155,-.108,.803),(.188,-.108,.803)],.007,leather,8)
        for j in range(3):tube('Braid tassel',[(.17+j*.007,-.112,.805),(.172+j*.005,-.116,.76)], [.007,.001],hair,8)
    else:
        for j in range(7):
            x=-.10+j*.033
            tube('Nape rust hair',[(x,.093,1.12),(x+.012,.107,1.065),(x-.004,.094,1.045)], [.018,.016,.002],hair,8)
    # Crown, dent and broad brim: measured to fit ALL four 58-degree facings.
    vertices=[];faces=[]
    for k,(rx,ry) in enumerate([(.132,.116),(.17,.135),(.22,.156),(.245,.165)]):
        for j in range(64):
            a=j*math.tau/64;z=1.188-.009*(rx/.245)**2*math.cos(2*a)
            vertices.append((rx*math.cos(a),ry*math.sin(a),z))
    for k in range(3):
        for j in range(64):faces.append((k*64+j,k*64+(j+1)%64,(k+1)*64+(j+1)%64,(k+1)*64+j))
    brim=mesh('Full field-hat brim',vertices,[tuple(reversed(f)) for f in faces],hat)
    solid=brim.modifiers.new('Brim thickness','SOLIDIFY');solid.thickness=.007
    crown=loft('Dented field-hat crown',[(0,.008,1.18,.135,.116),(0,.010,1.225,.133,.113),
         (0,.015,1.285,.115,.094),(0,.013,1.327,.095,.073),(0,.009,1.338,.078,.061)],hat,40,boxiness=.82)
    # Real inset top crease, rather than a tall cylindrical cap.
    data=crown.data;v=[tuple(p.co) for p in data.vertices];f=[tuple(p.vertices) for p in data.polygons][:-1]
    center=len(v);v.append((0,.01,1.319))
    f.extend([(160+j,160+(j+1)%40,center) for j in range(40)])
    data.clear_geometry();data.from_pydata(v,[],f);data.update()
    for p in data.polygons:p.use_smooth=True
    loft('Leather hat band',[(0,.009,1.205,.137,.117),(0,.009,1.235,.134,.113)],hatband,40,boxiness=.82)
    buckle('Hat-band buckle',-.083,-.092,1.222,.026,.022,brass)
    # A modest upward-looking neutral head pose exposes the face beneath the
    # actual 3D brim at the locked elevated camera; camera itself never tilts.
    head_parts=[o for o in bpy.data.objects if o not in head_start and o.type=='MESH'
                and not any(word in o.name for word in ['braid','Braid'])]
    pivot=Vector((0,0,1.03));tilt=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-10),4,'X')@Matrix.Translation(-pivot)
    bpy.context.view_layer.update()
    for o in head_parts:o.matrix_world=tilt@o.matrix_world
    # Clothing/gear remain generic field kit, no logos or cultural symbols.
    for sign in [-1,1]:
        mesh('Folded shirt collar',[(sign*.024,-.045,1.013),(sign*.078,-.074,.986),(sign*.045,-.111,.945),
             (sign*.018,-.070,.978)],[(0,1,2,3)],cuff)
        ribbon('Shoulder backpack strap',[(sign*.11,.11,.989),(sign*.12,-.025,1.004),(sign*.122,-.089,.956),
               (sign*.118,-.098,.84),(sign*.101,-.086,.69)],.023,leather)
        buckle('Shoulder-strap buckle',sign*.118,-.108,.855,.030,.038,brass)
    for z in [.72,.79,.86,.93]:ball('Shirt button',(0,-.092,z),(.004,.003,.004),brass,12,6)
    # Scarf is a soft neck band with two compact folded ends.
    loft('Neck scarf band',[(0,0,.989,.052,.049),(0,0,1.012,.052,.049)],scarf,24)
    ball('Scarf knot',(0,-.078,.985),(.019,.020,.021),scarf)
    for sign in [-1,1]:
        tube('Folded scarf end',[(sign*.006,-.087,.978),(sign*.024,-.105,.942),(sign*.032,-.104,.901)], [.014,.018,.002],scarf,6)
    loft('Utility belt',[(0,0,.635,.124,.085),(0,0,.665,.123,.084)],leather,32,boxiness=.75)
    buckle('Belt buckle',0,-.091,.65,.044,.031,brass)
    satchel_x=.15 if girl else -.15
    box('Leather utility pouch',(satchel_x,-.035,.615),(.082 if girl else .108,.085,.105 if girl else .14),leather,.012)
    box('Utility pouch flap',(satchel_x,-.083,.646),(.086 if girl else .11,.014,.052),hatband,.0045)
    buckle('Utility pouch clasp',satchel_x,-.095,.629,.021,.023,brass)
    if not girl:ribbon('Diagonal satchel strap',[(.105,-.101,.97),(.06,-.110,.87),(-.04,-.106,.76),(-.137,-.09,.67)],.017,leather)
    box('Backpack body',(0,.139,.85),(.255,.15,.29),leather,.025)
    box('Backpack top flap',(0,.169,.992),(.270,.16,.055),hat,.017)
    box('Rear pack pocket',(0,.229,.802),(.185,.055,.105),leather,.013)
    box('Rear pocket flap',(0,.260,.845),(.195,.014,.041),hatband,.006)
    for sign in [-1,1]:
        ribbon('Backpack closure strap',[(sign*.073,.249,.97),(sign*.073,.254,.85),(sign*.073,.259,.75)],.018,hatband)
        buckle('Rear pack buckle',sign*.073,.265,.88,.027,.032,brass)
    roll=tube('Canvas bedroll',[(-.14,.153,1.035),(.14,.153,1.035)],.040,bed,24)
    for sign in [-1,1]:
        points=[]
        for j in range(45):
            t=j/44;r=.004+.034*t;a=t*math.tau*2.2
            points.append((sign*.142,.153+r*math.cos(a),1.035+r*math.sin(a)))
        tube('Rolled bedding spiral',points,.0025,bed_dark,6)
    # Root at feet: accessories are separately editable and future-rig friendly.
    objects=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    root=bpy.data.objects.new(identity,None);bpy.context.collection.objects.link(root)
    root['characterId']=identity;root['forward']='-Y / south';root['approval']='Issue 57 / owner proportions and appearance pending'
    for obj in objects:
        obj.parent=root;obj['role']='character-master';obj['characterId']=identity
        # Freeze evaluated tessellation identically for rendering and glTF.
        # Keep the underlying editable quad lofts; no manual mesh flattening.
        tri=obj.modifiers.new('Canonical source and GLB triangulation','TRIANGULATE')
        tri.quad_method='FIXED';tri.ngon_method='CLIP';tri.keep_custom_normals=True
    prepare_components(objects)
    bpy.context.view_layer.update()
    return root,objects,{'characterId':identity,'hair':'blonde braid' if girl else 'rust-red swept hair',
                         'eyes':'blue' if girl else 'green','irisLinearRGB':list(iris.diffuse_color)[:3],
                         'stance':'neutral relaxed A stance','headPoseDegreesX':-10,
                         'sourceUVs':'Packed Component UV charts; portable exporter repacks its shared PBR atlas',
                         'componentPivots':'Local bounds centers under a feet-root; not a skeletal rig',
                         'canonicalTriangulation':'FIXED quad / CLIP ngon modifier on every component',
                         'geometrySha256':geometry_digest(objects)}
