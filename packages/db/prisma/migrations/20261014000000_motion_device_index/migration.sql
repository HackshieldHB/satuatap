-- Per-device latest-motion lookups (automation evaluation, loadLastMotionAt)
-- need an index on (deviceId, occurredAt). Without it, Postgres parallel-seq-scans
-- the whole MotionEvent table per automation tick. IF NOT EXISTS so it is a no-op
-- where the index was already created by hand on a running deployment.
CREATE INDEX IF NOT EXISTS "MotionEvent_deviceId_occurredAt_idx" ON "MotionEvent"("deviceId", "occurredAt");
