ALTER TABLE projects
    ADD COLUMN is_approved_by_curator BOOLEAN NOT NULL DEFAULT false;
