// Vodun ceremony masks (Arène de Ouidah) and art objects for the craftsmen's stalls.
// The original models (generated with Tripo, ~2 million triangles and three
// 4K textures each, 60 to 72 MB) are in sources/masques/ and sources/art/; this script
// derives lightweight versions for the browser. Run from the project root:
// npm run masques            (all)       npm run masques -- statue   (just one)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, weld, simplify, prune, dedup, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'fs';

await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const triangles = doc => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
// [folder, file, target triangles]: the arena's masks, then the art objects for the craftsmen's stalls.
const LISTE = [['masques', 'zangbeto', 60000], ['masques', 'egungun-traditionnel', 60000], ['masques', 'egungun-groupe', 90000],
  ['art', 'tete-sculptee', 30000], ['art', 'portrait-cubiste', 30000], ['art', 'sphere-rouge', 20000], ['art', 'statue', 30000], ['art', 'creature-paille', 40000]];
const seuls = process.argv.slice(2);
for (const [dossier, nom, cible] of LISTE) {
  if (seuls.length && !seuls.includes(nom)) continue;
  const doc = await io.read(`sources/${dossier}/${nom}.glb`);
  const avant = triangles(doc);
  await doc.transform(
    dequantize(), dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: cible / avant, error: 0.01 }),
    prune(),
    // Colour at 1024 px, relief (normal map) and roughness at 512 px, as JPEG.
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], slots: /baseColor/ }),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512], slots: /normal|metallicRoughness/ }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const out = `public/modeles/${nom}.glb`;
  await io.write(out, doc);
  console.log(`${nom}.glb: ${Math.round(avant)} → ${Math.round(triangles(doc))} triangles, ${(statSync(out).size / 1e6).toFixed(2)} MB`);
}
