// Files a Tripo model (public/modeles/batiments/<id>.glb) among the characters' accessories,
// with 512 px textures, and removes it from the list of buildings.
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const id = process.argv[2], src = `public/modeles/batiments/${id}.glb`, dir = 'public/modeles/personnages/accessoires', out = `${dir}/${id}.glb`;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }));
fs.mkdirSync(dir, { recursive: true }); await io.write(out, doc); fs.rmSync(src);
const bi = 'public/modeles/batiments/index.json', b = JSON.parse(fs.readFileSync(bi, 'utf8')); delete b[id]; fs.writeFileSync(bi, JSON.stringify(b, null, 1));
const ai = `${dir}/index.json`, a = fs.existsSync(ai) ? JSON.parse(fs.readFileSync(ai, 'utf8')) : {}; a[id] = { largeur: .55, octets: fs.statSync(out).size }; fs.writeFileSync(ai, JSON.stringify(a, null, 1));
console.log(id, (fs.statSync(out).size / 1e3).toFixed(0), 'ko');
