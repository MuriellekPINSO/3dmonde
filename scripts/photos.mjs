// Photos and videos taken on site ("3D monde" folder): copied, rotated the right
// way up and downsized for the places' on-site photo card (src/surplace.js).
// macOS only (sips reads the iPhone's HEIC). Run from the project root: npm run photos
import { execFileSync } from 'child_process';
import fs from 'fs';
import sharp from 'sharp';

const SRC = process.env.SOURCES_3DMONDE || '/Users/muriellekpinso/Projects/3D-MONDE/public';
const PHOTOS = {
  corniche: ['IMG_6196', 'IMG_6198', 'IMG_6201', 'IMG_6205', 'IMG_6207', 'IMG_6209', 'IMG_6214', 'IMG_6217', 'IMG_6218', 'IMG_9335', 'IMG_9337', 'IMG_9334'],
  jardin: ['IMG_6221', 'IMG_6223', 'IMG_6225', 'IMG_9364', 'IMG_9367'],
  cite: ['IMG_6229', 'IMG_6230', 'IMG_6232', 'IMG_9365', 'IMG_9366'],
  amazone: ['IMG_6248', 'IMG_6252', 'IMG_6251', 'IMG_6243', 'IMG_6244', 'IMG_6246', 'IMG_6240'],
  congres: ['IMG_6253', 'IMG_6256', 'IMG_6257', 'IMG_6258'],
  murport: ['IMG_9339', 'IMG_9340', 'IMG_9342', 'IMG_9343'],
};
fs.mkdirSync('public/photos', { recursive: true });
const trouver = n => ['.HEIC', '.JPG', '.jpg', '.jpeg'].map(e => `${SRC}/espace/${n}${e}`).find(f => fs.existsSync(f));
let n = 0;
for (const [lieu, liste] of Object.entries(PHOTOS)) for (const [i, nom] of liste.entries()) {
  const f = trouver(nom); if (!f) { console.warn('missing', nom); continue; }
  const out = `public/photos/${lieu}-${i + 1}.jpg`, tmp = out + '.tmp.jpg';
  // sips decodes the HEIC; sharp rotates the image according to the camera orientation and downsizes it.
  execFileSync('sips', ['-s', 'format', 'jpeg', f, '--out', tmp], { stdio: 'ignore' });
  await sharp(tmp).rotate().resize(1400, 1400, { fit: 'inside' }).jpeg({ quality: 74, mozjpeg: true }).toFile(out);
  fs.rmSync(tmp); n++;
}
fs.mkdirSync('public/videos', { recursive: true });
for (const [src, dst] of [['360/CORNICHE .mp4', 'corniche-drone.mp4'], ['360/TOUR.mp4', 'tour-drone.mp4']]) if (fs.existsSync(`${SRC}/${src}`)) fs.copyFileSync(`${SRC}/${src}`, `public/videos/${dst}`);
console.log(`${n} photos in public/photos, videos in public/videos`);
