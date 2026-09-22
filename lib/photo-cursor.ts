// Cursor de paginação do feed principal: composto por (taken_at, id) em vez
// de só `id`, já que a ordem agora é cronológica (mais recentes primeiro).
// Fotos sem `taken_at` usam esse sentinel, que ordena como "mais recente que
// qualquer data real" — assim elas aparecem no início do feed em vez de
// ficarem perdidas no meio de fotos com data.
export const NULL_DATE_SENTINEL = "9999-12-31";

export function effectiveTakenAt(takenAt: string | null): string {
  return takenAt ?? NULL_DATE_SENTINEL;
}

export function encodePhotoCursor(takenAt: string | null, id: number): string {
  return `${effectiveTakenAt(takenAt)}|${id}`;
}

export function decodePhotoCursor(cursor: string): { takenAt: string; id: number } {
  const separatorIndex = cursor.lastIndexOf("|");
  return {
    takenAt: cursor.slice(0, separatorIndex),
    id: Number(cursor.slice(separatorIndex + 1)),
  };
}
