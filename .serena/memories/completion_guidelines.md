# Completion Guidelines

Before marking a task as completed, follow these verification steps:

1. **Linting & Formatting**:
   - Run `pnpm format` to ensure code style.
   - Run `pnpm check` to verify and fix linting issues.
2. **Type Safety**:
   - Check for TypeScript errors. Ensure no `any` types are used.
3. **Automated Testing**:
   - Run `pnpm test:unit` for backend logic verification.
   - Run `pnpm test:e2e` for critical user flows if relevant.
4. **Database Verification**:
   - If schema changed, run `pnpx prisma generate` and `pnpx prisma db push` (dev) or check migrations.
5. **Build Check**:
   - Run `pnpm build` to ensure the production build still works.
6. **Documentation**:
   - Update `SPEC.md` if new features were added.
   - Update project memories if architecture or conventions changed significantly.
7. **UI Review**:
   - Verify that UI elements follow the premium design guidelines (vibrant, modern, responsive).
