-- Services are privately owned by users; a team assignment is no longer required.
ALTER TABLE services
  ALTER COLUMN team_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_owner_name_personal
  ON services (owner_id, name)
  WHERE team_id IS NULL;
