# Code Style and Conventions

## General Rules
- **Language**: TypeScript (v5.9.3)
- **Identity**: Next.js 16 (App Router) + React 19.
- **Indentation**: Tabs (configured in Biome).
- **Quotes**: Double quotes for strings.
- **Semicolons**: Mandatory.

## Coding Standards (from coding-rules.md)
- **Strict Typing**: NO `any` type allowed. Comprehensive TypeScript definitions are mandatory.
- **DRY Principle**: Avoid logic duplication across the codebase.
- **API Router**: Backend logic MUST be implemented in API Routes.
- **Performance**: Optimize for Next.js 16 streaming and caching capabilities.
- **Readability**: Ensure code is easily understandable for third-party developers (Reference Implementation).

## UI/UX Guidelines
- **Modern Aesthetics**: Premium design with vibrant colors, smooth transitions, and glassmorphism.
- **Responsive**: Mobile-first responsive design.
- **Accessibility**: Use semantic HTML and Radix UI primitives for accessibility.

## File Naming
- Components: PascalCase (e.g., `ReportList.tsx`).
- Hooks/Utils: kebab-case (e.g., `use-debounce.ts`).
- Pages/Layouts: Next.js conventions (`page.tsx`, `layout.tsx`).
