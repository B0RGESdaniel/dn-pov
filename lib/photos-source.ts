import {
  getAlbums as getRealGetAlbums,
  getPhotos as getRealGetPhotos,
  getPlaces as getRealGetPlaces,
  getTags as getRealGetTags,
} from "@/lib/db";
import { getMockAlbums, getMockPhotos, getMockPlaces, getMockTags } from "@/lib/mock-data";

// Ponto único que as páginas usam pra ler fotos/álbuns/locais/tags.
// Com USE_MOCK_DATA=true no .env.local, serve os dados de fotos/info.json
// (lib/mock-data.ts) em vez do Turso — pra testar telas sem gastar banco/R2.
const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export const getPhotos = USE_MOCK ? getMockPhotos : getRealGetPhotos;
export const getAlbums = USE_MOCK ? getMockAlbums : getRealGetAlbums;
export const getPlaces = USE_MOCK ? getMockPlaces : getRealGetPlaces;
export const getTags = USE_MOCK ? getMockTags : getRealGetTags;
