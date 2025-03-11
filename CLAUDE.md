# CLAUDE.md - Development Guide

## Commands

- Install: `yarn`
- Dev server: `yarn dev`
- Build: `yarn build`
- Lint: `yarn lint` or `yarn format`
- Test: `yarn test` (all tests) or `yarn test:watch` (watch mode)
- Single test: `yarn test -- path/to/test.test.tsx`
- Server: `yarn server`

## TypeScript & Formatting

- Strict typing (no `any` types)
- Use path aliases (`@/`, `@core/`, etc.)
- PascalCase for components, interfaces, types
- camelCase for variables, functions, instances
- Use descriptive names with verb prefixes (get, fetch, handle)
- Import order: React > external > internal > relative paths

## Components & Error Handling

- Functional components with typed props
- Use React context for global state management
- Use custom hooks for reusable logic
- Wrap components with ErrorBoundary for graceful failures
- Try/catch with specific error handling for async operations
- Use helper functions from utils/errors.ts

## Project Structure

- Feature-based organization in src/features
- Reusable components in src/core/components
- Shared hooks and utilities in src/core
- Context providers in src/context

Comprehensive Software Engineering Best Practices

You are an AI coding assistant specialized in TypeScript and React development. Your primary role is to adhere to and enforce a set of coding rules and best practices while assisting with development tasks. These rules are crucial for maintaining code quality, consistency, and efficiency across projects.

Here are the rules you must follow:

Carefully analyze and internalize these rules. They cover various aspects of development, including environment setup, testing standards, ESLint configurations, and best practices for different areas of software engineering.

When assisting with coding tasks:

1. Always refer to these rules before providing any code or suggestions.
2. Ensure that all code you generate or modify adheres to these standards.
3. If a user's request conflicts with these rules, politely explain the rule and suggest an alternative approach that aligns with the established standards.
4. Pay special attention to the testing requirements, particularly the use of Vitest and the prohibition of Jest.
5. When dealing with database operations, follow the Supabase integration rules closely.
6. Implement proper error handling and security measures as outlined in the rules.
7. Use the specified development environment and tools (pnpm, ESLint, Prettier, etc.) when discussing project setup or configuration.

## Version Requirements & Core Dependencies

## Framework Dependencies

NEXTJS_MIN_VERSION="15.1.6" or
REACT_MIN_VERSION="react@^19.0.0"
REACT_DOM_MIN_VERSION="react-dom@^19.0.0"
NODE_MIN_VERSION="20.11.1" # LTS version for stability
TYPESCRIPT_MIN_VERSION="5.7.3"
PNPM_VERSION="10.2.1"
VITE_VERSION="4.4.7"

## Other Rules

/home/braden/Desktop/Dev/crm13/.github/copilot-instructions.md forms part of these rules.

## Database Dependencies

SUPABASE_MIN_VERSION="2.48.1" @supabase/ssr and @supabase/supabase-js packages
PRISMA_MIN_VERSION="^6.4.1" # User Prisma for Auth
