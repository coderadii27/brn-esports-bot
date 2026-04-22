import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, 'db.json');

let data = {};
try {
  if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  data = {};
}

function ensure() {
  data.warns ||= {};
  data.economy ||= {};
  data.levels ||= {};
  data.notes ||= {};
  data.todos ||= {};
  data.guilds ||= {};
  data.tickets ||= {};
  data.afk ||= {};
  data.snipes ||= {};
  data.reminders ||= [];
  data.suggestions ||= [];
  data.feedback ||= [];
  data.reports ||= [];
}
ensure();

let dirty = false;
export function markDirty() { dirty = true; }

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data));
    dirty = false;
  } catch (e) {
    console.error('DB save error:', e);
  }
}

setInterval(() => { if (dirty) save(); }, 4000);
process.on('SIGINT', () => { save(); process.exit(0); });
process.on('SIGTERM', () => { save(); process.exit(0); });

export function db() { return data; }

export function getEconomy(userId) {
  data.economy[userId] ||= { wallet: 250, bank: 0, lastDaily: 0, lastWeekly: 0, lastWork: 0, lastBeg: 0, lastRob: 0, inventory: [] };
  return data.economy[userId];
}

export function getLevel(userId) {
  data.levels[userId] ||= { xp: 0, level: 0, lastMsg: 0 };
  return data.levels[userId];
}

export function getGuild(gid) {
  data.guilds[gid] ||= {};
  return data.guilds[gid];
}

export function getNotes(userId) {
  data.notes[userId] ||= [];
  return data.notes[userId];
}

export function getTodos(userId) {
  data.todos[userId] ||= [];
  return data.todos[userId];
}

export function getWarns(userId) {
  data.warns[userId] ||= [];
  return data.warns[userId];
}
