# Completion Guidelines

Before marking a task as completed, ensure the following:

1. **Linting & Formatting**: Run `pnpm check` to ensure code style and linting rules are met. Fix any issues found by Biome.
2. **Type Safety**: Ensure there are no TypeScript errors. Use strict typing as per the project rules (no `any`).
3. **Database State**: If changes involve the database, ensure SQL migrations and seeds are updated if necessary.
4. **Build Verification**: Run `pnpm build` to verify that the project still builds successfully.
5. **UI Consistency**: Ensure the UI remains premium and high-quality, adhering to the design requirements (vibrant colors, responsiveness).
6. **Documentation**: Update `SPEC.md` or other documentation if the changes introduce new features or change existing logic.
