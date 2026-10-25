"""Compact review sheets and measurable author evidence. Python 3 + Pillow.
Run after source/audit.py and source/capture.cjs; original evidence stays untouched.
"""
from pathlib import Path
import hashlib,json,math,subprocess,ast
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT.parent
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
F=ImageFont.truetype(font,24);S=ImageFont.truetype(font,15);T=ImageFont.truetype(font,12)
paper='#f2eedf';ink='#253c34';muted='#576158'
baseline_paths=['source/render.py','source/fixture.json','index.html','manifest.json']+[str(p.relative_to(BASE)) for folder in ['renders','previews'] for p in (BASE/folder).glob('*') if p.is_file()]
for path in baseline_paths:
 expected=subprocess.check_output(['git','show','a91847d9e3223e2fb831a133c91d754daed33705:docs/art/reference-scene/'+path],cwd=BASE)
 assert (BASE/path).read_bytes()==expected,('baseline changed',path)
def wall_ast(path):
 tree=ast.parse(path.read_text())
 return [ast.dump(n,include_attributes=False) for n in ast.walk(tree) if isinstance(n,ast.If) and isinstance(n.test,ast.Compare) and any(isinstance(c,ast.Constant) and c.value=='#' for c in n.test.comparators)]
assert wall_ast(BASE/'source/render.py')==wall_ast(ROOT/'source/render.py'), 'wall construction changed'
records=json.loads((ROOT/'previews/browser-checks.json').read_text())['results']
geometry=json.loads((ROOT/'previews/geometry-checks.json').read_text())
assert (ROOT/'source/fixture.json').read_bytes()==(BASE/'source/fixture.json').read_bytes()
# Pixel bounds join actual mesh projection with actual captured viewport framing.
framing=[]
exports={}
for angle,roles in geometry['angles'].items():
 exported={}
 for token,obj in roles.items():
  r,c=obj['cell'];u=1400/14.3;gx=700+(c-4)*u;gy=700-(5-r)*u*math.sin(math.radians(float(angle)));a,b,cc,d=obj['pixel_bounds_1400'];bounds=[128+(a-gx)*224/u,208+(b-gy)*224/u,128+(cc-gx)*224/u,208+(d-gy)*224/u]
  exported[token]={'proposed_body_bounds':bounds,'fits_256x352_with_4px_border':bounds[0]>=4 and bounds[1]>=4 and bounds[2]<=252 and bounds[3]<=348}
  assert exported[token]['fits_256x352_with_4px_border']
 exports[angle]=exported
(ROOT/'previews/export-bounds.json').write_text(json.dumps({'status':'calculated body bounds only; no RGBA sprites or shadows exported','angles':exports},indent=2)+'\n')
for rec in records:
 if rec['treatment']=='original':continue
 angle=str(rec['elevation'])+'.0' if rec['elevation']==58 else str(rec['elevation'])
 targets={}
 for token,obj in geometry['angles'][angle].items():
  scale=rec['image']['width']/1400;left=(rec['scene']['width']-rec['image']['width'])/2;top=(rec['scene']['height']-rec['image']['height'])/2
  a,b,c,d=obj['pixel_bounds_1400'];bounds=[left+a*scale,top+b*scale,left+c*scale,top+d*scale]
  targets[token]={'visual_bounds_in_scene':bounds,'cropped_pixels':{'left':max(0,-bounds[0]),'top':max(0,-bounds[1]),'right':max(0,bounds[2]-rec['scene']['width']),'bottom':max(0,bounds[3]-rec['scene']['height'])},'wall_occluded_samples':[name for name,ray in obj['sample_rays'].items() if ray['wall_occluded']]}
 framing.append({'file':rec['file'],'tile_pitch':[rec['tilePitchX'],rec['tilePitchY']],'cropped_badge_centers':[t['token'] for t in rec['targets'] if t['cropped']],'targets':targets})
(ROOT/'previews/framing-checks.json').write_text(json.dumps({'kind':'author projection/raycast evidence; human perception review still pending','results':framing},indent=2)+'\n')

def find(treatment,mood,badges=True,device='phone-320'):
 return next(r for r in records if r['device']==device and r['treatment']==treatment and r['mood']==mood and r['badges']==badges)
def picture(rec):return Image.open(ROOT/'previews'/rec['file']).convert('RGB')
def scene_crop(rec):
 im=picture(rec);s=rec['scene'];return im.crop((round(s['x']),round(s['y']),round(s['right']),round(s['bottom'])))

# Main board: all original/new 320 px screenshots shown at native size.
board=Image.new('RGB',(2040,1430),paper);d=ImageDraw.Draw(board)
d.text((28,20),'THE PALLET GARDEN / FOCUSED SECOND PASS',font=F,fill=ink)
d.text((28,56),'Actual Chromium concept captures · 320 × 568 at 1:1 · same fixture · final visual approval pending',font=S,fill=muted)
for col,(treatment,title) in enumerate([('original','01 / ORIGINAL 70.1°'),('refined-70.1','02 / REFINED 70.1° CONTROL'),('refined-58','03 / REFINED 58° CANDIDATE')]):
 x=28+col*675;d.text((x,100),title,font=S,fill=ink)
 for i,mood in enumerate(['daylight','dusk']):
  r=find(treatment,mood);d.text((x+i*325,130),mood.upper()+' / BADGES ON',font=T,fill=muted);board.paste(picture(r),(x+i*325,153))
 if treatment=='original':
  d.text((x,747),'Original source, renders and page remain untouched.',font=S,fill=muted)
  d.text((x,773),'Original in-world letters are baked into these masters.',font=T,fill=muted)
  d.text((x,835),'RECOMMEND / REFINED 58°',font=F,fill=ink)
  d.text((x,878),'Daylight primary / lantern dusk companion',font=S,fill=ink)
  d.text((x,908),'Semantic badges ON by default; OFF tests the art.',font=S,fill=muted)
  d.text((x,946),'More body and slat depth; ~10% tighter vertical pitch.',font=S,fill=muted)
  d.text((x,976),'Exit meaning still benefits from the E badge / legend.',font=S,fill=muted)
  d.text((x,1014),'Proposal only / owner and independent review pending.',font=S,fill=muted)
 else:
  for i,mood in enumerate(['daylight','dusk']):
   r=find(treatment,mood,False);crop=scene_crop(r);d.text((x+i*325,747),mood.upper()+' / BADGES OFF / NATIVE CROP',font=T,fill=ink);board.paste(crop,(x+i*325,773))
 d.text((x,1112),'32.0 px horizontal cell pitch · '+('27.2' if treatment=='refined-58' else '30.1')+' px row pitch',font=T,fill=muted)
# Secondary device references, explicitly scaled; full captures remain separately linked.
d.text((28,1160),'58° DEVICE COVERAGE / BOTH MOODS CAPTURED / THUMBNAILS BELOW SCALED',font=S,fill=ink)
for i,(device,title) in enumerate([('phone-390','390 × 844'),('landscape','844 × 390'),('desktop','1440 × 1000')]):
 x=28+i*675;d.text((x,1190),title,font=S,fill=ink)
 for j,mood in enumerate(['daylight','dusk']):
  im=picture(find('refined-58',mood,True,device));im.thumbnail((310,190));board.paste(im,(x+j*325,1220))
board.save(ROOT/'previews/contact-sheet.jpg',quality=94,subsampling=0)

# Native target cutouts: full-color ON/OFF and grayscale OFF, not enlarged pixels.
# 80px squares intentionally include adjacent wall/path context; no hidden upscaling.
board=Image.new('RGB',(1260,1040),paper);d=ImageDraw.Draw(board)
d.text((25,18),'SILHOUETTE CHECK / NATIVE 320 PX VIEWPORT PIXELS',font=F,fill=ink)
d.text((25,54),'80 × 80 at 1:1, clamped to scene edges · ON / OFF / gray OFF · no baked letters in revised art',font=S,fill=muted)
for row,(treatment,mood) in enumerate([(t,m) for t in ['refined-70.1','refined-58'] for m in ['daylight','dusk']]):
 y=100+row*230;d.text((25,y),treatment+' / '+mood.upper(),font=S,fill=ink)
 for col,token in enumerate(['S','X','F','E']):
  x=25+col*307;d.text((x,y+30),token+' / ON     OFF     GRAY OFF',font=T,fill=muted)
  for j,badges in enumerate([True,False,False]):
   rec=find(treatment,mood,badges);im=scene_crop(rec);target=next(t for t in rec['targets'] if t['token']==token)
   # Center between ground-cell anchor and prop body, using common fixed crop for ON/OFF.
   unit=rec['tilePitchX'];a=math.radians(rec['elevation']);cx=target['x']-.20*unit;cy=target['y']-.17*rec['tilePitchY']+.06*math.cos(a)*unit-.22*unit
   left=max(0,min(im.width-80,round(cx-40)));top=max(0,min(im.height-80,round(cy-40)));crop=im.crop((left,top,left+80,top+80))
   if j==2:crop=ImageOps.grayscale(crop).convert('RGB')
   board.paste(crop,(x+j*94,y+57))
  d.text((x,y+148),'Same source pixels; no color-only test claim.',font=T,fill=muted)
board.save(ROOT/'previews/silhouette-sheet.jpg',quality=94,subsampling=0)

# Preserve original proof; new manifest pins both original and revised source/evidence.
files=[p for folder in ['renders','previews','source'] for p in sorted((ROOT/folder).glob('*')) if p.is_file()]+[ROOT/'index.html']
manifest={'status':'v0.2 design candidates; owner/Engineering/QA/Narrative approval pending','original_commit':'a91847d9e3223e2fb831a133c91d754daed33705','original_render_source_sha256':hashlib.sha256((BASE/'source/render.py').read_bytes()).hexdigest(),'original_manifest_sha256':hashlib.sha256((BASE/'manifest.json').read_bytes()).hexdigest(),'sha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Generated contact / silhouette sheets; framing, source and image hash evidence.')
print('Cropped target bodies:',[(r['file'],t)for r in framing for t,v in r['targets'].items()if any(v['cropped_pixels'].values())])
print('Wall-occluded samples:',[(a,t,n)for a,v in geometry['angles'].items()for t,o in v.items()for n,r in o['sample_rays'].items()if r['wall_occluded']])
