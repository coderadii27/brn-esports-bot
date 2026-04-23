# BRN ESPORTS — Official Discord Bot

> Crafted with care by **CYCLOPS** for the BRN ESPORTS community.

A focused Discord bot built for tournament organizers — handles tournament setup end‑to‑end, runs giveaways, and gives moderators quick prefix commands. Bilingual (Hinglish) UX so the community feels right at home.

---

## ✨ Features

### 🏆 Tournament Organize System (`/tournament`)
- **One‑command setup** — auto‑creates a full category with 11 themed channels (info, rules, updates, registration‑format, registration, confirm‑teams, roadmaps, schedule, point‑table, query, etc.).
- **Admin‑defined slots & team size** — every tournament accepts a custom **slot count** (2–256 teams) and **players‑per‑team** (1–15). All starter messages, the registration template, and the validator adapt automatically.
- **Smart registration validator** — checks team name, tag, captain, exact number of @mentioned players, and contact. Reacts ✅ on success, ❌ with a detailed reason on failure.
- **Auto slot lock** — registration channel is locked the moment the configured slot count fills up; further attempts get a 🔒 reaction.
- **Confirm‑teams feed** — every accepted team is mirrored into the confirm‑teams channel with a live `Team #X / SLOTS` counter.
- Subcommands: `setup`, `panel`, `list`, `delete`, `announce`, `teams`.

### 🎉 Giveaways
- `/gstart` — start a giveaway (prize, duration, winner count). Users join with a 🎉 reaction.
- `/gend` — end a running giveaway early and pick winners instantly.

### 🛡️ Prefix Moderation (`?`)
Quick‑hit moderator tools without slash command overhead:
- `?purge <count>` — bulk delete messages
- `?ban <user> [reason]`
- `?kick <user> [reason]`
- `?mute <user> <duration> [reason]` — supports `s/m/h/d/w/mo`
- `?unmute <user>`
- `?anc <message>` — clean announcement embed

### 🎨 Polished Presence
- Status: **Do Not Disturb**
- Activity: *Organising Tournaments at BRN ESPORTS*
- App description: **BRN ESPORTS OFFICIAL BOT**
- Every embed footer: **CYCLOPS • crafted with care**

---

## 🧰 Tech Stack
- **Node.js 24** + **discord.js v14**
- **pnpm** workspace monorepo
- JSON file storage (`artifacts/discord-bot/data/db.json`)
- ESM JavaScript

---

## 🚀 Running Locally

### 1. Install
```bash
pnpm install
```

### 2. Set environment variables
| Variable | Description |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application (client) ID of the bot |
| `SESSION_SECRET` | Random string used for session signing |

### 3. Start the bot
```bash
pnpm --filter @workspace/discord-bot run dev
```

You should see:
```
Loaded 3 slash commands.
✨ Logged in as CYCLOPS#XXXX — N servers.
```

---

## 📁 Project Structure
```
artifacts/
└── discord-bot/
    ├── src/
    │   ├── index.js                   # Bot bootstrap, presence, command registration
    │   ├── embed.js                   # Shared embed styling + footer
    │   ├── db.js                      # JSON file persistence
    │   ├── prefix.js                  # ? prefix moderation handler
    │   ├── commands/
    │   │   ├── tournament.js          # /tournament + subcommands
    │   │   └── giveaway.js            # /gstart, /gend
    │   └── interactions/
    │       ├── buttons.js             # Panel button → modal
    │       ├── modals.js              # Tournament create modal handler
    │       └── tournament-msg.js      # Registration parser + slot lock
    └── data/db.json                   # Persistent storage
```

---

## 📝 Quick Start: Create a Tournament
```
/tournament setup name:Summer Showdown slots:16 team-size:4
```
The bot will spin up the entire category, drop pre‑formatted starter embeds in every channel, and start accepting registrations using the exact format players see in `#registration-format`.

---

## 💛 Credits
Built with care by **CYCLOPS** for **BRN ESPORTS**.
