// Cursor de paginação do feed principal: composto por (sort_key, id).
// sort_key é um valor aleatório fixo, atribuído uma vez na inserção da foto —
// dá uma ordem orgânica (não agrupada por lote de upload/local/cor) e estável
// entre requests, o que a paginação por cursor exige.
export function encodePhotoCursor(sortKey: number, id: number): string {
  return `${sortKey}|${id}`;
}

export function decodePhotoCursor(cursor: string): { sortKey: number; id: number } {
  const separatorIndex = cursor.lastIndexOf("|");
  return {
    sortKey: Number(cursor.slice(0, separatorIndex)),
    id: Number(cursor.slice(separatorIndex + 1)),
  };
}
