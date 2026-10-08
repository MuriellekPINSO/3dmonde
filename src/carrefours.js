import { roadLines } from './ville.js';

// ---------- Road network: junctions and routes ----------
// Graph of OpenStreetMap streets (from main roads down to neighbourhood streets). The lines have
// been simplified, and the junction nodes along with them: we recompute the intersections
// geometrically (except between a bridge and whatever passes underneath). Used to turn at
// junctions in Zém Run, then to recompute the route to the next stops.

const R = { pret: false, X: null, Z: null, adj: null, grille: null, n: 0 };
const FUSION = 1.6, CASE = 25, FACTEUR = [1, 1, 1.05, 1.2, 1.6];
const cle = (x, z, c) => Math.floor(x / c) + ',' + Math.floor(z / c);

export function construireReseau() {
  if (R.pret) return R;
  const t0 = performance.now();
  // 1. Segments, sorted into a 40 m grid.
  const segs = [], g = new Map(), C = 40;
  roadLines.forEach((L, li) => {
    if (L.cls > 4) return;
    for (let k = 1; k < L.pts.length; k++) {
      const [ax, az] = L.pts[k - 1], [bx, bz] = L.pts[k], i = segs.length; segs.push([li, k, ax, az, bx, bz, []]);
      for (let cx = Math.floor((Math.min(ax, bx) - 2) / C); cx <= Math.floor((Math.max(ax, bx) + 2) / C); cx++)
        for (let cz = Math.floor((Math.min(az, bz) - 2) / C); cz <= Math.floor((Math.max(az, bz) + 2) / C); cz++) { const q = cx + ',' + cz; let l = g.get(q); if (!l) g.set(q, l = []); l.push(i); }
    }
  });
  // 2. Intersections (and street ends lying on another street, within 1.5 m).
  for (const l of g.values()) for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
    const S = segs[l[a]], T = segs[l[b]];
    if (S[0] === T[0] && Math.abs(S[1] - T[1]) <= 1) continue;
    const pS = roadLines[S[0]].bridge, pT = roadLines[T[0]].bridge;
    const rx = S[4] - S[2], rz = S[5] - S[3], sx = T[4] - T[2], sz = T[5] - T[3], den = rx * sz - rz * sx; if (Math.abs(den) < 1e-6) continue;
    const qx = T[2] - S[2], qz = T[3] - S[3], t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
    const lS = Math.hypot(rx, rz) || 1, lT = Math.hypot(sx, sz) || 1, eS = 1.5 / lS, eT = 1.5 / lT;
    if (t < -eS || t > 1 + eS || u < -eT || u > 1 + eT) continue;
    const auBout = t <= eS || t >= 1 - eS || u <= eT || u >= 1 - eT;
    if (pS !== pT && !auBout) continue; // a bridge passes overhead: no junction
    S[6].push(Math.max(0, Math.min(1, t))); T[6].push(Math.max(0, Math.min(1, u)));
  }
  // 3. Nodes (merged within 1.6 m) and edges along each street.
  const X = [], Z = [], fin = new Map(), adj = [];
  const noeud = (x, z) => {
    const cx = Math.floor(x / FUSION), cz = Math.floor(z / FUSION);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = fin.get((cx + i) + ',' + (cz + j)); if (l) for (const n of l) if (Math.hypot(X[n] - x, Z[n] - z) < FUSION) return n; }
    const n = X.length; X.push(x); Z.push(z); adj.push([]); const q = cx + ',' + cz; let l = fin.get(q); if (!l) fin.set(q, l = []); l.push(n); return n;
  };
  const lier = (a, b, cls) => { if (a === b || adj[a].some(e => e[0] === b)) return; const d = Math.hypot(X[a] - X[b], Z[a] - Z[b]); adj[a].push([b, d, cls]); adj[b].push([a, d, cls]); };
  let precLigne = -1, prec = -1;
  for (const S of segs) {
    const [li, , ax, az, bx, bz, coupes] = S, cls = roadLines[li].cls;
    if (li !== precLigne) { precLigne = li; prec = noeud(ax, az); }
    for (const t of [...new Set(coupes.map(v => Math.round(v * 1000) / 1000))].sort((p, q) => p - q)) { const n = noeud(ax + (bx - ax) * t, az + (bz - az) * t); lier(prec, n, cls); prec = n; }
    const n = noeud(bx, bz); lier(prec, n, cls); prec = n;
  }
  const grille = new Map(); for (let n = 0; n < X.length; n++) { const q = cle(X[n], Z[n], CASE); let l = grille.get(q); if (!l) grille.set(q, l = []); l.push(n); }
  Object.assign(R, { pret: true, X, Z, adj, grille, n: X.length });
  console.info(`road network: ${X.length} nodes in ${Math.round(performance.now() - t0)} ms`);
  return R;
}

export function noeudsPres(x, z, r) {
  const out = [], cx = Math.floor(x / CASE), cz = Math.floor(z / CASE), k = Math.ceil(r / CASE);
  for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) { const l = R.grille.get((cx + i) + ',' + (cz + j)); if (l) for (const n of l) { const d = Math.hypot(R.X[n] - x, R.Z[n] - z); if (d < r) out.push([n, d]); } }
  return out.sort((a, b) => a[1] - b[1]);
}

// Shortest path (weighted: main roads are preferred), optionally avoiding one node.
function dijkstra(depart, arrivee, interdit = -1, fac = FACTEUR) {
  const N = R.n, dist = new Float64Array(N).fill(Infinity), prec = new Int32Array(N).fill(-1), tas = [[0, depart]]; dist[depart] = 0;
  const pousser = e => { tas.push(e); let i = tas.length - 1; while (i) { const p = (i - 1) >> 1; if (tas[p][0] <= tas[i][0]) break; [tas[p], tas[i]] = [tas[i], tas[p]]; i = p; } };
  const tirer = () => { const h = tas[0], d = tas.pop(); if (tas.length) { tas[0] = d; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < tas.length && tas[a][0] < tas[m][0]) m = a; if (b < tas.length && tas[b][0] < tas[m][0]) m = b; if (m === i) break; [tas[m], tas[i]] = [tas[i], tas[m]]; i = m; } } return h; };
  while (tas.length) {
    const [d, n] = tirer(); if (d > dist[n]) continue; if (n === arrivee) break;
    for (const [m, l, c] of R.adj[n]) { if (m === interdit) continue; const nd = d + l * fac[c]; if (nd < dist[m]) { dist[m] = nd; prec[m] = n; pousser([nd, m]); } }
  }
  if (!isFinite(dist[arrivee])) return null;
  const out = []; for (let n = arrivee; n !== -1; n = prec[n]) out.push(n); return out.reverse();
}

// Direction of a branch: follow the street from the junction for `dist` metres, as straight as possible.
function suivre(n, m, dist) {
  const chemin = [n, m]; let total = Math.hypot(R.X[m] - R.X[n], R.Z[m] - R.Z[n]), a = n, b = m;
  while (total < dist && chemin.length < 40) {
    const dx = R.X[b] - R.X[a], dz = R.Z[b] - R.Z[a], l = Math.hypot(dx, dz) || 1; let best = -1, bc = -2;
    for (const [c] of R.adj[b]) { if (c === a) continue; const ex = R.X[c] - R.X[b], ez = R.Z[c] - R.Z[b], el = Math.hypot(ex, ez) || 1, cos = (dx * ex + dz * ez) / (l * el); if (cos > bc) { bc = cos; best = c; } }
    if (best < 0 || bc < .3) break; total += Math.hypot(R.X[best] - R.X[b], R.Z[best] - R.Z[b]); chemin.push(best); a = b; b = best;
  }
  return chemin;
}

/** Junctions along a path C: position s, the possible branches on the left / right, and "straight on"
 *  (`droit`) when the planned route turns there (`sens`: +1 if it turns right, −1 if left). */
export function carrefoursDe(C) {
  if (!R.pret) return [];
  const out = [], vus = new Set(), dir = (i, j) => { const dx = C.X[j] - C.X[i], dz = C.Z[j] - C.Z[i], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  for (let i = 30; i < C.n - 15; i += 3) { // not the junction we have just turned at
    for (const [n] of noeudsPres(C.X[i], C.Z[i], 4)) {
      if (vus.has(n) || R.adj[n].length < 3) continue; vus.add(n);
      const dIn = dir(i - 12, i), dOut = dir(i, i + 12), cotes = {};
      // Does the route turn here? (more than 35° between the way in and the way out)
      const tourne = dIn[0] * dOut[0] + dIn[1] * dOut[1] < .82, sens = dIn[0] * dOut[1] - dIn[1] * dOut[0] > 0 ? 1 : -1;
      for (const [m, , cls] of R.adj[n]) {
        const ch = suivre(n, m, 16), f = ch[ch.length - 1], ex = R.X[f] - R.X[n], ez = R.Z[f] - R.Z[n], el = Math.hypot(ex, ez); if (el < 6) continue;
        const ux = ex / el, uz = ez / el, dot = ux * dIn[0] + uz * dIn[1], croix = dIn[0] * uz - dIn[1] * ux;
        if (ux * dOut[0] + uz * dOut[1] > .82 || -dot > .82) continue; // the road being followed, or the one we came from
        // Angle relative to the way in: under 35° it is "straight on" (offered only if the route itself turns).
        const cote = tourne && dot > .82 ? 'droit' : croix > 0 ? 'droite' : 'gauche', score = cls * 2 + Math.abs(dot);
        if (!cotes[cote] || score < cotes[cote].score) cotes[cote] = { m, cls, score };
      }
      if (cotes.gauche || cotes.droite || cotes.droit) out.push({ s: i, n, tourne, sens, ...cotes });
    }
  }
  return out.sort((a, b) => a.s - b.s);
}

/** Route after a turn: from point (x, z) through junction n, branch m, then the stops `cibles` [[x, z], …]. */
export function itineraire(x, z, n, m, cibles) {
  const debut = suivre(n, m, 35), pts = [[x, z], ...debut.map(k => [R.X[k], R.Z[k]])];
  let cur = debut[debut.length - 1], avant = debut[debut.length - 2];
  for (const [cx, cz] of cibles) {
    const t = noeudsPres(cx, cz, 80)[0]; if (!t) return null;
    const ch = dijkstra(cur, t[0], avant) || dijkstra(cur, t[0]); if (!ch) return null;
    for (const k of ch.slice(1)) pts.push([R.X[k], R.Z[k]]);
    if (ch.length > 1) { avant = ch[ch.length - 2]; cur = ch[ch.length - 1]; }
  }
  return pts;
}

// The hurried customer's shortcut: pure distance, small streets included (no preference for main roads).
const DIRECT = [1, 1, 1, 1, 1];
/** Shortest route from (x, z) to the first target, starting from the node nearest to (xa, za)
 *  (a point slightly ahead of the zém), then the following targets via main roads as usual. */
export function itineraireCourt(x, z, xa, za, cibles) {
  if (!R.pret || !cibles.length) return null;
  const d0 = noeudsPres(xa, za, 60)[0]; if (!d0) return null;
  const pts = [[x, z], [R.X[d0[0]], R.Z[d0[0]]]];
  let cur = d0[0], avant = -1;
  for (const [k, [cx, cz]] of cibles.entries()) {
    const t = noeudsPres(cx, cz, 80)[0]; if (!t) return null;
    const ch = dijkstra(cur, t[0], avant, k === 0 ? DIRECT : FACTEUR) || dijkstra(cur, t[0]); if (!ch) return null;
    for (const n of ch.slice(1)) pts.push([R.X[n], R.Z[n]]);
    if (ch.length > 1) { avant = ch[ch.length - 2]; cur = ch[ch.length - 1]; }
  }
  return pts;
}
