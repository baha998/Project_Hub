CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE tasks
    ADD COLUMN priority task_priority NOT NULL DEFAULT 'MEDIUM';
