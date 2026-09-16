-- Optimistic concurrency counters for replace-all SOP editor sections.
ALTER TABLE `DetailSOP`
  ADD COLUMN `prosedurRevision` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `diagramRevision` INTEGER NOT NULL DEFAULT 0;
