"""Native-size direction/stature evidence; no magnification of game sprites."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
for tile in [36,48]:
    out=Image.new('RGB',(768,730),(225,220,207));d=ImageDraw.Draw(out)
    d.text((12,8),f'Native {tile}px cells | each group: Meshy / PR58 | S E N W | D=day, E=evening',fill='black')
    for row,height in enumerate([.95,1.15,1.34]):
        y=36+row*230;d.text((12,y),f'Meshy {height:.2f} cells / PR58 1.342 cells',fill='black')
        for k,(id,who,mood) in enumerate([('source-1','boy','daylight'),('source-2','girl','daylight'),('source-1','boy','dusk'),('source-2','girl','dusk')]):
            yy=y+20+k*48;d.text((8,yy+10),f'{who} '+('D' if mood=='daylight' else 'E'),fill='black')
            for j,facing in enumerate(['south','east','north','west']):
                for kind in [0,1]:
                    p=ROOT/(f'assets/{id}-{height:.2f}-{facing}-{mood}-body.png' if kind==0 else f'comparison/pr58/characters/{who}/assets/{who}-{facing}-{mood}-body.png')
                    im=Image.open(p).resize((round(256*tile/224),round(352*tile/224)),Image.Resampling.LANCZOS)
                    # Anchor aligned per pair; backgrounds shared, RGBA composited once.
                    x=95+j*160+kind*64;out.paste(im,(x,yy-6),im)
    out.save(ROOT/f'evidence/native-facings-{tile}.png',optimize=True)
# All neutral sides on one moderate review artifact.
out=Image.new('RGB',(1024,808),(210,206,195));d=ImageDraw.Draw(out)
for i,id in enumerate(['source-1','source-2']):
    for j,f in enumerate(['south','east','north','west']):
        im=Image.open(ROOT/f'evidence/{id}-neutral-{f}.png');im.thumbnail((256,384));out.paste(im,(j*256,i*404+20),im);d.text((j*256+8,i*404+3),f'{id} {f}',fill='black')
out.save(ROOT/'evidence/neutral-inspection.jpg',quality=90)
