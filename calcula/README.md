# Calcula Workspace

This folder is the clean rebuild area for a fresh implementation.
The legacy codebase remains untouched and is used only as reference.

## Structure

- `apps/backend` - fresh backend implementation (start small)
- `apps/frontend` - fresh frontend implementation (start small)
- `reference` - copied files from old project for lookup
- `docs` - rebuild scope and implementation notes
- `scripts` - helper scripts for bootstrap/export

## Rebuild strategy

1. Keep scope tiny for v1.
2. Build only core vertical slices end-to-end.
3. Add features incrementally after tests pass.

See `docs/PHASE_1_SCOPE.md` for first milestone.
