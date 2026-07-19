-- Migration: 020_performance_indexes.sql
-- Add missing performance indexes to frequently queried columns

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_photo_id ON purchases(photo_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_contributor_submissions_status ON contributor_submissions(status);
