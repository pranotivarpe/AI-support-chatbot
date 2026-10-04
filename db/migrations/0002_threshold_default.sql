-- Calibrated against gemini-embedding-001 (answerable ≈0.59–0.70, off-topic ≈0.52–0.61).
ALTER TABLE bots ALTER COLUMN confidence_threshold SET DEFAULT 0.55;
