import { Client, GatewayIntentBits, Collection, REST, Routes, Partials } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db } from './db.js';
import { baseEmbed, COLOR } from './embed.js';
import { handleButton } from './interactions/buttons.js';
import { handleModal } from './interactions/modals.js';
import { handleTournamentMessage } from './interactions/tournament-msg.js';
import { handlePrefix } from './prefix.js';
import { startGiveawayTicker } from './commands/giveaway.js';

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
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
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
      console.warn(`Duplicate command: ${cmd.data.name}`);
      continue;
    }
    client.commands.set(cmd.data.name, cmd);
    allCommandData.push(cmd.data.toJSON());
  }
}
console.log(`Loaded ${client.commands.size} slash commands.`);

const rest = new REST().setToken(TOKEN);

async function registerGuildCommands(guildId) {
  try {
    const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: allCommandData });
    console.log(`✅ Guild ${guildId}: registered ${Array.isArray(data) ? data.length : '?'} commands.`);
  } catch (e) {
    console.error(`Guild registration failed (${guildId}):`, e.message);
  }
}

client.once('clientReady', async () => {
  console.log(`✨ Logged in as ${client.user.tag} — ${client.guilds.cache.size} servers.`);
  client.user.setPresence({ activities: [{ name: `?help • /tournament • /gstart` }], status: 'online' });
  for (const [gid] of client.guilds.cache) await registerGuildCommands(gid);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: allCommandData });
    console.log('✅ Global commands synced.');
  } catch (e) { console.error('Global registration failed:', e.message); }
  startGiveawayTicker(client);
});

client.on('guildCreate', (g) => { console.log(`➕ Joined ${g.name}`); registerGuildCommands(g.id); });

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
    } else if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd?.autocomplete) await cmd.autocomplete(interaction);
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
      else if (interaction.isRepliable?.()) await interaction.reply(payload);
    } catch {}
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  handlePrefix(msg).catch(e => console.error('Prefix error:', e));
  handleTournamentMessage(msg).catch(e => console.error('Tournament msg error:', e));
});

client.login(TOKEN);
