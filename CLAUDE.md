# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
npm run setup          # install deps + prisma generate + prisma migrate dev

# Development
npm run dev            # start dev server at http://localhost:3000 (uses Turbopack)

# Build & production
npm run build
npm run start

# Linting
npm run lint

# Tests
npm run test           # run all tests with vitest
npx vitest run src/lib/__tests__/file-system.test.ts  # run a single test file

# Database
npm run db:reset       # reset dev database (destructive)
npx prisma migrate dev # apply new migrations
npx prisma studio      # open Prisma GUI
```

## Environment

- Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` for live AI generation
- Without an API key the app falls back to a mock provider that returns static code

## Architecture

UIGen is a Next.js 15 (App Router) app that lets users describe React components in a chat and see them rendered live.

### Request Flow

1. User sends a message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Server streams a response using the Vercel AI SDK + Claude Haiku (`src/lib/provider.ts`)
3. Claude calls tools (`file-manager`, `str-replace`) to write/modify virtual files
4. Tool results update `VirtualFileSystem` in the client via `FileSystemContext`
5. `PreviewFrame` picks up changed files, Babel-transforms JSX in-browser, renders in an iframe

### Key Abstractions

**Virtual File System** (`src/lib/file-system.ts`): An in-memory `VirtualFileSystem` class — no disk writes. Serialized as JSON when persisted to SQLite via Prisma.

**AI Provider** (`src/lib/provider.ts`): Returns a real Anthropic client or a mock. Uses `claude-haiku-4-5-20251001` by default with Anthropic prompt caching.

**AI Tools** (`src/lib/tools/`): Two tools Claude uses to produce code:
- `file-manager` — create/read/update/delete files in the VFS
- `str-replace` — precise targeted edits within an existing file

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Browser-side Babel transform that converts JSX + import maps to executable JS for the preview iframe.

**Contexts** (`src/lib/contexts/`):
- `ChatContext` — messages, streaming state, project metadata
- `FileSystemContext` — current VFS state, active file, sync with server

**Auth** (`src/lib/auth.ts`, `src/actions/index.ts`): JWT sessions (7-day expiry) issued as HTTP-only cookies, bcrypt password hashing, optional anonymous mode.

### Database Schema (Prisma / SQLite)

The full schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database.

Two models: `User` (id, email, password, createdAt, updatedAt) and `Project` (id, userId, name, messages JSON, data JSON, timestamps). Projects store chat history and the full VFS as JSON blobs. `userId` is nullable, supporting anonymous projects.

### UI Layout

Split-pane layout in `src/app/main-content.tsx`:
- **Left (35%):** `ChatInterface` — message list + input
- **Right (65%):** Tabs toggling between `PreviewFrame` (live iframe) and Monaco `CodeEditor` + file tree

### Path Alias

`@/*` resolves to `src/*` (configured in `tsconfig.json`).

## Code Style

- Use comments sparingly. Only comment complex code.
