# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/discord-bot run dev` — run Discord bot

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Discord Bot (`artifacts/discord-bot`)

Plain JavaScript (ESM) workspace package, runs as a console workflow (no HTTP). Built on `discord.js` v14.

- 98 top-level slash commands, 110+ user-facing (Economy uses subcommand group `/eco …`).
- Categories: info, moderation, utility, fun, games, economy (subcmds), leveling, tickets, notes/todos, server config, AI, misc.
- Storage: JSON file at `artifacts/discord-bot/data/db.json` (autosaved every 4s on change).
- AI commands (`/ai-ask`, `/ai-summarize`, `/ai-translate`) use Replit's AI Integrations OpenAI proxy (`AI_INTEGRATIONS_OPENAI_*` env vars).
- Required secrets: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`. Bot needs intents: Guilds, GuildMembers, GuildMessages, MessageContent, GuildMessageReactions enabled in the Discord Developer Portal.
- Entry point `src/index.js` loads commands from `src/commands/`, registers them globally on ready, and routes button/modal interactions through `src/interactions/`.
