CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  blur_data_url TEXT,
  width INTEGER,
  height INTEGER,
  taken_at TEXT,
  edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('place', 'subject', 'color')),
  lat REAL,
  lon REAL,
  UNIQUE (name, category)
);

CREATE TABLE photo_tags (
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX idx_photo_tags_tag_id ON photo_tags(tag_id);