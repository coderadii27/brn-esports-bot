import { Client, GatewayIntentBits, Collection, REST, Routes, Partials } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, getLevel, getGuild, markDirty } from './db.js';
import { baseEmbed, info, COLOR, EMOJI } from './embed.js';
import { handleButton } from './interactions/buttons.js';
import { handleModal } from './interactions/modals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message],
});
client.commands = new Collection();
const allCommandData = [];

const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).sort()) {
  if (!file.endsWith('.js')) continue;
  const mod = await import(pathToFileURL(path.join(cmdDir, file)).href);
  for (const cmd of mod.default ?? []) {
    if (!cmd?.data?.name) continue;
    if (client.commands.has(cmd.data.name)) {
      console.warn(`Duplicate command name: ${cmd.data.name}`);
      continue;
    }
    client.commands.set(cmd.data.name, cmd);
    allCommandData.push(cmd.data.toJSON());
  }
}

console.log(`Loaded ${client.commands.size} commands.`);

client.once('clientReady', async () => {
  console.log(`✨ Logged in as ${client.user.tag} — ${client.guilds.cache.size} servers.`);
  client.user.setPresence({ activities: [{ name: `/help • ${client.commands.size} commands` }], status: 'online' });
  const rest = new REST().setToken(TOKEN);
  try {
    const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: allCommandData });
    console.log(`✅ Registered ${Array.isArray(data) ? data.length : '?'} application commands.`);
  } catch (e) {
    console.error('Command registration failed:', e);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      await cmd.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (e) {
    console.error('Interaction error:', e);
    try {
      const payload = { embeds: [baseEmbed({ title: '⛔  Error', description: 'Kuch galat ho gaya. Try again.', color: COLOR.danger })], ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch {}
  }
});

// Welcome + auto-role
client.on('guildMemberAdd', async (member) => {
  const g = getGuild(member.guild.id);
  if (g.autoRole) {
    try { await member.roles.add(g.autoRole); } catch {}
  }
  if (g.welcomeChannel) {
    const ch = member.guild.channels.cache.get(g.welcomeChannel);
    if (ch && ch.isTextBased()) {
      const e = baseEmbed({
        title: `${EMOJI.spark}  Welcome to ${member.guild.name}!`,
        description: `Hey <@${member.id}> — itna pyara server me aane ke liye thanks!\nMember **#${member.guild.memberCount}**.`,
        color: COLOR.accent,
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });
      ch.send({ embeds: [e] }).catch(() => {});
    }
  }
});

// XP on message + AFK + snipe
const XP_COOLDOWN = 60_000;
const xpForLevel = (lvl) => 100 * (lvl + 1) ** 2;

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.guild) return;

  // AFK return
  if (db().afk[msg.author.id]) {
    delete db().afk[msg.author.id]; markDirty();
    msg.reply({ embeds: [info(`Welcome back! AFK status removed.`)], allowedMentions: { repliedUser: false } }).catch(() => {});
  }
  // AFK mention notify
  for (const [uid] of msg.mentions.users) {
    const a = db().afk[uid];
    if (a) {
      msg.channel.send({ embeds: [info(`<@${uid}> is AFK: ${a.reason} • <t:${Math.floor(a.at / 1000)}:R>`)] }).catch(() => {});
    }
  }

  // XP gain
  const l = getLevel(msg.author.id);
  if (Date.now() - (l.lastMsg ?? 0) > XP_COOLDOWN) {
    l.lastMsg = Date.now();
    const gain = 10 + Math.floor(Math.random() * 15);
    l.xp += gain;
    while (l.xp >= xpForLevel(l.level)) {
      l.xp -= xpForLevel(l.level);
      l.level++;
      msg.channel.send({ embeds: [baseEmbed({ title: `${EMOJI.trophy}  Level Up!`, description: `<@${msg.author.id}> reached **Level ${l.level}**!`, color: COLOR.gold })] }).catch(() => {});
    }
    markDirty();
  }
});

client.on('messageDelete', (msg) => {
  if (!msg.guild || msg.author?.bot) return;
  db().snipes[msg.channelId] = { content: msg.content ?? '', author: msg.author?.tag ?? 'Unknown', at: Date.now() };
  markDirty();
});

// Reminder ticker
setInterval(async () => {
  const now = Date.now();
  const due = db().reminders.filter(r => r.at <= now);
  if (!due.length) return;
  db().reminders = db().reminders.filter(r => r.at > now);
  markDirty();
  for (const r of due) {
    try {
      const ch = await client.channels.fetch(r.channelId);
      if (ch?.isTextBased()) ch.send({ content: `<@${r.userId}>`, embeds: [baseEmbed({ title: `${EMOJI.clock}  Reminder`, description: r.text, color: COLOR.info })] }).catch(() => {});
    } catch {}
  }
}, 15_000);

client.login(TOKEN);
