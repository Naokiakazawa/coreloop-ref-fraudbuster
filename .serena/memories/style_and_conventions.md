# Code Style and Conventions

## General
- **Language**: TypeScript (v5.9.3)
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Formatting**: Managed by Biome. Indent style is tabs. Quotes are double quotes.
- **Linting**: Biome recommended rules and ESLint.

## Coding Rules (from coding-rules.md)
- **API Router**: Use API Router for backend logic.
- **Strict Typing**: No `any` type allowed. Thorough typing is mandatory.
- **DRY Principle**: Adhere strictly to the "Don't Repeat Yourself" principle.
- **Performance**: Implement Next.js best practices to ensure high performance.
- **Maintainability**: Prioritize clarity and ease of understanding for third parties.
- **Aesthetics**: The design should be premium, modern, and high-quality (vibrant colors, glassmorphism, animations).

## Component Structure
- Uses Next.js App Router conventions.
- Components are functional components using hooks.
- UI components are separated into `components/` directory, following a Radix-based design system.
