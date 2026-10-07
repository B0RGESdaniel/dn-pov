import {
  getColors as getRealGetColors,
  getMemories as getRealGetMemories,
  getPhotos as getRealGetPhotos,
  getPlaceByName as getRealGetPlaceByName,
  getPlaces as getRealGetPlaces,
  getTags as getRealGetTags,
} from "@/lib/db";
import {
  getMockColors,
  getMockMemories,
  getMockPhotos,
  getMockPlaceByName,
  getMockPlaces,
  getMockTags,
} from "@/lib/mock-data";

// Ponto único que as páginas usam pra ler fotos/locais/cores/tags.
// Com USE_MOCK_DATA=true no .env.local, serve os dados de fotos/info.json
// (lib/mock-data.ts) em vez do Turso — pra testar telas sem gastar banco/R2.
const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export const getPhotos = USE_MOCK ? getMockPhotos : getRealGetPhotos;
export const getPlaces = USE_MOCK ? getMockPlaces : getRealGetPlaces;
export const getPlaceByName = USE_MOCK ? getMockPlaceByName : getRealGetPlaceByName;
export const getColors = USE_MOCK ? getMockColors : getRealGetColors;
export const getTags = USE_MOCK ? getMockTags : getRealGetTags;
export const getMemories = USE_MOCK ? getMockMemories : getRealGetMemories;
