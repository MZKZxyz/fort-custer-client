"""Derivatives and deterministic author checks; Python 3 + Pillow.
Run after Blender renders and capture.cjs (see README).
"""
import json, hashlib, math
from pathlib import Path
from collections import deque
from PIL import Image, ImageOps, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]

def prepare():
    for mood in ['daylight','dusk']:
        src=ROOT/'renders'/f'{mood}.png'
        if src.exists():
            Image.open(src).convert('RGB').save(ROOT/'renders'/f'{mood}.jpg',quality=94,subsampling=0)
            src.unlink()

def finish():
    grid=json.loads((ROOT/'source/fixture.json').read_text())['grid']
    assert len(grid)==11 and all(len(r)==9 for r in grid)
    start=(9,2);seen={start};q=deque([start])
    while q:
        r,c=q.popleft()
        for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
            if 0<=rr<11 and 0<=cc<9 and grid[rr][cc]!='#' and (rr,cc) not in seen:seen.add((rr,cc));q.append((rr,cc))
    assert len(seen)==sum(t!='#' for row in grid for t in row)
    assert all(sum(row.count(t) for row in grid)==1 for t in 'SXFE')
    # A literal footprint plan: these are logical blocked cells, not beauty-render claims.
    svg=['<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600"><rect width="480" height="600" fill="#f2eedf"/><g font-family="sans-serif" fill="#253c34"><text x="30" y="30" font-size="17">FC / 01 — collision footprint</text><text x="30" y="51" font-size="11">Authored static fixture · 9 × 11 · no gameplay</text>']
    for r,row in enumerate(grid):
        for c,t in enumerate(row):
            x=30+c*46;y=75+r*44
            svg.append(f'<rect x="{x}" y="{y}" width="46" height="44" fill="'+('#54604c' if t=='#' else '#dfc9a3')+'" stroke="#f2eedf" stroke-width=".5"/>')
            if t not in '# ':svg.append(f'<text x="{x+23}" y="{y+29}" text-anchor="middle" font-size="23" font-weight="bold">{t}</text>')
    svg.append('<text x="30" y="585" font-size="11">Dark = blocked 1×1 · light = path · all path cells connected</text></g></svg>')
    (ROOT/'previews/collision-plan.svg').write_text(''.join(svg)+'\n')
    def luminance(h):
        v=[int(h[i:i+2],16)/255 for i in (0,2,4)];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
        return sum(x*w for x,w in zip(v,[.2126,.7152,.0722]))
    def contrast(a,b):
        x,y=sorted([luminance(a),luminance(b)]);return round((y+.05)/(x+.05),2)
    pairs=[('ink / paper','253c34','f2eedf'),('secondary / paper','576158','f2eedf'),('accent / paper','8b4a2e','f2eedf'),('selected button','fff9e9','253c34')]
    contrast_results={name:contrast(a,b) for name,a,b in pairs};assert min(contrast_results.values())>=4.5
    font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    title=ImageFont.truetype(font,28);small=ImageFont.truetype(font,15)
    sheet=Image.new('RGB',(1600,1120),'#f2eedf');d=ImageDraw.Draw(sheet)
    d.text((35,24),'FORT CUSTER / THE PALLET GARDEN',font=title,fill='#253c34')
    d.text((35,66),'Actual Chromium captures of a static offline-render concept · owner review pending · no gameplay',font=small,fill='#576158')
    for i,mood in enumerate(['daylight','dusk']):
        x=35+i*790
        d.text((x,110),mood.upper()+' / 320 × 568',font=small,fill='#253c34')
        phone=Image.open(ROOT/'previews'/f'mobile-{mood}.jpg');sheet.paste(phone,(x,141))
        desktop=Image.open(ROOT/'previews'/f'desktop-{mood}.jpg');desktop.thumbnail((730,507))
        d.text((x,738),'DESKTOP / 1440 × 1000 (scaled to fit this contact sheet)',font=small,fill='#253c34')
        desktop.thumbnail((730,310));sheet.paste(desktop,(x,770))
        # Native mobile grayscale inset, from the exact captured pixels.
        gray=ImageOps.grayscale(phone.crop((16,158,304,474))).convert('RGB')
        sheet.paste(gray,(x+350,141));d.text((x+350,495),'Grayscale crop / same capture',font=small,fill='#576158')
    sheet.save(ROOT/'previews/contact-sheet.jpg',quality=94,subsampling=0)
    # Full-resolution wall/prop region with no illustration or synthetic replacement.
    im=Image.open(ROOT/'renders/daylight.jpg');im.crop((230,240,1170,1120)).save(ROOT/'previews/daylight-detail.jpg',quality=94,subsampling=0)
    report={'author_checks_only':True,'independent_QA':'pending','fixture':{'rows':11,'columns':9,'connected_path_cells':len(seen),'one_each':'S X F E'},'ui_contrast_ratios':contrast_results,'motion':'no animation, transitions, flashes, moving fire or fog','limitations':['not a game renderer','not a transparent sprite pack','not real-device testing','no screen-reader gameplay claim','image texture contrast is not measured by UI token ratios']}
    (ROOT/'previews/art-checks.json').write_text(json.dumps(report,indent=2)+'\n')
    manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['renders','previews'] for p in sorted((ROOT/folder).glob('*')) if p.is_file()}
    (ROOT/'manifest.json').write_text(json.dumps({'version':'0.1','status':'owner review pending','sha256':manifest},indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    import sys
    prepare() if '--prepare' in sys.argv else finish()
