CREATE TABLE credentials(member_id TEXT PRIMARY KEY REFERENCES members(id), password_hash TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_member ON sessions(member_id);
CREATE INDEX sessions_expiration ON sessions(expires_at);
CREATE TABLE login_attempts(key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, blocked_until INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
