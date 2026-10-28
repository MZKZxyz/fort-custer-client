"""Read-only GLB structural audit. No Meshy API calls or source writes."""
import argparse, hashlib, io, json, struct
from pathlib import Path
from PIL import Image
import numpy as np

def inspect(path):
    data=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',data)
    assert magic==0x46546c67 and version==2 and length==len(data)
    chunks=[]; offset=12
    while offset<len(data):
        size,kind=struct.unpack_from('<II',data,offset);offset+=8
        chunks.append((kind,data[offset:offset+size]));offset+=size
    gltf=json.loads(chunks[0][1]); binary=next(b for k,b in chunks if k==0x004e4942)
    primitives=[p for m in gltf.get('meshes',[]) for p in m['primitives']]
    def accessor(index):
        a=gltf['accessors'][index];v=gltf['bufferViews'][a['bufferView']]
        w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']])
        return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize))
    metrics=[]
    for p in primitives:
        pos=accessor(p['attributes']['POSITION']);uv=accessor(p['attributes']['TEXCOORD_0']);n=accessor(p['attributes']['NORMAL'])
        idx=accessor(p['indices']).reshape(-1,3);tri=pos[idx]
        twiceArea=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)
        lengths=np.linalg.norm(n,axis=1)
        metrics.append({'finitePositions':bool(np.isfinite(pos).all()),'finiteUV':bool(np.isfinite(uv).all()),'finiteNormals':bool(np.isfinite(n).all()),
          'normalLengthRange':[float(lengths.min()),float(lengths.max())],
          'uvBounds':[[float(uv[:,i].min()),float(uv[:,i].max())] for i in [0,1]],
          'zeroAreaTriangles':int((twiceArea==0).sum()),'nearZeroAreaTriangles1eMinus12':int((twiceArea<1e-12).sum()),
          'attributeAndIndexBytes':sum(accessor(i).nbytes for i in list(p['attributes'].values())+[p['indices']])})
    images=[]
    for im in gltf.get('images',[]):
        if 'bufferView' in im:
            v=gltf['bufferViews'][im['bufferView']]; b=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
            image=Image.open(io.BytesIO(b))
            pixels=np.array(image.convert('RGB'))
            stats={'channelMeanRGB8':[round(float(x),3) for x in pixels.mean(axis=(0,1))],'channelMinMaxRGB8':[[int(pixels[:,:,j].min()),int(pixels[:,:,j].max())] for j in range(3)]}
            images.append({**stats,'name':im.get('name'),'mimeType':im.get('mimeType'),'size':list(image.size),'mode':image.mode,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'embedded':True})
        else: images.append({'uri':im.get('uri'),'embedded':False})
    return {'sourceFile':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'asset':gltf['asset'],
      'triangles':sum(gltf['accessors'][p['indices']]['count']//3 for p in primitives if p.get('mode',4)==4),
      'vertices':sum(gltf['accessors'][p['attributes']['POSITION']]['count'] for p in primitives),
      'meshCount':len(gltf.get('meshes',[])),'primitiveCount':len(primitives),'attributes':[p['attributes'] for p in primitives],
      'geometryMetrics':metrics,
      'positionAccessorBounds':[{'min':gltf['accessors'][p['attributes']['POSITION']].get('min'),'max':gltf['accessors'][p['attributes']['POSITION']].get('max')} for p in primitives],
      'nodes':gltf.get('nodes',[]),'scenes':gltf.get('scenes',[]),'materials':gltf.get('materials',[]),'images':images,
      'textures':gltf.get('textures',[]),'samplers':gltf.get('samplers',[]),'skins':gltf.get('skins',[]),'animations':gltf.get('animations',[]),
      'morphTargetCounts':[len(p.get('targets',[])) for p in primitives],
      'externalResources':[v['uri'] for key in ['images','buffers'] for v in gltf.get(key,[]) if 'uri' in v],
      'extensionsUsed':gltf.get('extensionsUsed',[])}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('inputs',nargs='+',type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps({'schema':'fc-meshy-source-audit-v1','sources':[dict(id=f'source-{i+1}',**inspect(path)) for i,path in enumerate(a.inputs)]},indent=2)+'\n')
