// State shared between modules: whatever changes along the way and that
// several files read or modify (camera flight, traffic, selection…).
import { reduceMotion } from './base.js';
export const E = {
  flight: null,
  zems: null, zemsProches: null, zemState: [], zemOn: true,
  tokpas: null, tokpaState: [],
  lamps: null, foamMat: null,
  showQ: true, selected: null,
  riseDone: reduceMotion, frameN: 0,
};
