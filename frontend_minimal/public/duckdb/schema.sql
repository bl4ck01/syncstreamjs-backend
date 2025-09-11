-- Single denormalized table — faster for read-heavy app
CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY,
    stream_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'live', 'movie', 'series'
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    stream_icon TEXT,
    cover TEXT,
    plot TEXT,
    genre TEXT,
    releaseDate TEXT,
    rating TEXT,
    added TEXT,
    num INTEGER
);

-- Critical indexes for 200k+ dataset
CREATE INDEX IF NOT EXISTS idx_type_category ON streams(type, category_id);
CREATE INDEX IF NOT EXISTS idx_category ON streams(category_id);
CREATE INDEX IF NOT EXISTS idx_type ON streams(type);
CREATE INDEX IF NOT EXISTS idx_num ON streams(num);