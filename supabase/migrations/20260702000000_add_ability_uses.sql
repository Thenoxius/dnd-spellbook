-- Track used counts of limited-use class abilities (Rage, Bardic Inspiration,
-- Channel Divinity, Ki, ...). Keyed by ability id, e.g. {"rage": 1, "ki": 3}.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS ability_uses JSONB DEFAULT '{}';
