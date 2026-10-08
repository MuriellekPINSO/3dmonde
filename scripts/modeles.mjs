// Lightweight versions of the zémidjans from "3D monde" for the map's traffic.
// moto-taxi.glb (≈ 59,000 triangles) and zem.glb (≈ 155,000) stay untouched for
// the player and the game's obstacles; the "-lod" copies are used for the dozens of
// motorbikes riding near the camera. Run from the project root: npm run modeles
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, weld, simplify, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const triangles = doc => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
for (const [nom, ratio] of [['moto-taxi', 0.12], ['zem', 0.05]]) {
  const doc = await io.read(`sources/${nom}.glb`);
  const avant = triangles(doc);
  await doc.transform(dequantize(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004 }), prune());
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'EXT_meshopt_compression' || ext.extensionName === 'KHR_mesh_quantization') ext.dispose();
  await io.write(`public/modeles/${nom}-lod.glb`, doc);
  console.log(`${nom}-lod.glb: ${Math.round(avant)} → ${Math.round(triangles(doc))} triangles`);
}
