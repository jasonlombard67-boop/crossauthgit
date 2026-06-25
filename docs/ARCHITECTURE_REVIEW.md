
# Architecture Review

Current project is functional and already partially structured.

Recommended structure:

src/
  api/
  services/
  middleware/
  config/
  utils/

For Vercel compatibility, code was left unchanged.
High-priority improvements:
- Centralize request validation.
- Create shared API response helpers.
- Move auth business logic into dedicated services.
- Add repository layer for Prisma access.
- Add environment validation on startup.
- Add tests.

Current version in this package remains deployable while documenting the target structure.
