CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  blur_data_url TEXT,
  width INTEGER,
  height INTEGER,
  edited INTEGER NOT NULL DEFAULT 0,
  memory TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sort_key REAL  -- aleatório fixo por foto, atribuído no INSERT; define a ordem do feed principal
);

CREATE INDEX idx_photos_sort_key ON photos(sort_key, id);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('place', 'color')),
  parent_id INTEGER REFERENCES tags(id),  -- só em category='place': cidade -> país (NULL = é o país)
  lat REAL,
  lon REAL,
  color_bg TEXT,       -- só usado quando category = 'place'
  color_accent TEXT,   -- só usado quando category = 'place'
  UNIQUE (name, category, parent_id),
  CHECK (category = 'place' OR parent_id IS NULL)
);

-- UNIQUE(name, category, parent_id) não pega duplicata de país (parent_id NULL,
-- e NULL nunca é igual a NULL numa constraint de unicidade) — índice parcial cobre esse caso.
CREATE UNIQUE INDEX idx_tags_unique_root ON tags(name, category) WHERE parent_id IS NULL;

CREATE TABLE photo_tags (
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX idx_photo_tags_tag_id ON photo_tags(tag_id);