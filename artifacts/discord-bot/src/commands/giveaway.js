import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';

const GIFT = '🎉';

function parseDuration(str) {
  const m = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2];
  const map = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
    h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
    d: 86_400_000, day: 86_400_000, days: 86_400_000,
    w: 604_800_000, week: 604_800_000, weeks: 604_800_000,
    mo: 2_592_000_000, month: 2_592_000_000, months: 2_592_000_000,
  };
  return n * map[u];
}

function shortId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function giveawayEmbed({ id, prize, winners, hostId, endsAt, ended = false, winnerIds = [] }) {
  const t = Math.floor(endsAt / 1000);
  const desc = ended
    ? (winnerIds.length
        ? `## 🎊  ENDED!\n\n**Winners:** ${winnerIds.map(w => `<@${w}>`).join(', ')}\n\nCongratulations! 🥳`
        : '## 😢  ENDED!\n\nKoi entries nahi aayi — koi winner nahi.')
    : `### React with ${GIFT} to enter!\n\n⏳  Ends: <t:${t}:R>  •  <t:${t}:F>\n👑  Hosted by: <@${hostId}>\n🏆  Winners: **${winners}**`;
  return baseEmbed({
    title: `${GIFT}  GIVEAWAY  ${GIFT}`,
    description: `# 🎁 ${prize}\n\n${desc}`,
    color: ended ? COLOR.dark : COLOR.accent,
    footer: { text: `Giveaway ID: ${id}${ended ? ' • Ended' : ''}` },
    timestamp: new Date(endsAt).toISOString(),
  });
}

const data = new SlashCommandBuilder()
  .setName('gstart')
  .setDescription('Start a colorful giveaway')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages.toString())
  .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true).setMaxLength(200))
  .addStringOption(o => o.setName('duration').setDescription('e.g. 30s, 10m, 2h, 1d, 1w').setRequired(true))
  .addIntegerOption(o => o.setName('winners').setDescription('Winners count (default 1)').setMinValue(1).setMaxValue(20));

async function execute(interaction) {
  const prize = interaction.options.getString('prize');
  const durStr = interaction.options.getString('duration');
  const winners = interaction.options.getInteger('winners') ?? 1;
  const ms = parseDuration(durStr);
  if (!ms) return interaction.reply({ embeds: [err('Duration galat hai. Examples: `30s`, `10m`, `2h`, `1d`, `1w`.')], ephemeral: true });
  if (ms < 10_000) return interaction.reply({ embeds: [err('Minimum duration 10 seconds hai.')], ephemeral: true });

  const id = shortId();
  const endsAt = Date.now() + ms;
  await interaction.deferReply();
  const msg = await interaction.editReply({ embeds: [giveawayEmbed({ id, prize, winners, hostId: interaction.user.id, endsAt })] });
  try { await msg.react(GIFT); } catch {}

  db().giveaways[id] = {
    id, prize, winners,
    hostId: interaction.user.id,
    channelId: msg.channelId,
    messageId: msg.id,
    guildId: interaction.guild.id,
    endsAt, ended: false,
  };
  markDirty();
}

const endCmd = new SlashCommandBuilder()
  .setName('gend')
  .setDescription('End a giveaway by ID')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages.toString())
  .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true).setAutocomplete(true));

async function executeEnd(interaction) {
  const id = interaction.options.getString('id').toUpperCase().trim();
  const g = db().giveaways[id];
  if (!g || g.guildId !== interaction.guild.id) return interaction.reply({ embeds: [err('Giveaway ID nahi mili.')], ephemeral: true });
  if (g.ended) return interaction.reply({ embeds: [info('Ye giveaway already end ho chuka.')], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  await endGiveaway(interaction.client, g);
  await interaction.editReply({ embeds: [ok(`Giveaway **${g.prize}** end kar diya.`)] });
}

async function endAutocomplete(interaction) {
  const focused = interaction.options.getFocused().toUpperCase();
  const all = Object.values(db().giveaways).filter(g => g.guildId === interaction.guild?.id && !g.ended);
  return interaction.respond(all
    .filter(g => g.id.includes(focused) || g.prize.toUpperCase().includes(focused))
    .slice(0, 25)
    .map(g => ({ name: `${g.id} — ${g.prize}`.slice(0, 100), value: g.id })));
}

export async function endGiveaway(client, g) {
  if (g.ended) return;
  g.ended = true; markDirty();
  try {
    const ch = await client.channels.fetch(g.channelId);
    const msg = await ch.messages.fetch(g.messageId);
    const reaction = msg.reactions.cache.get(GIFT) ?? msg.reactions.resolve(GIFT);
    let entrants = [];
    if (reaction) {
      const users = await reaction.users.fetch();
      entrants = users.filter(u => !u.bot).map(u => u.id);
    }
    const pool = [...entrants];
    const winnerIds = [];
    while (winnerIds.length < g.winners && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      winnerIds.push(pool.splice(i, 1)[0]);
    }
    g.winnerIds = winnerIds; markDirty();
    await msg.edit({ embeds: [giveawayEmbed({ ...g, ended: true, winnerIds })] });
    if (winnerIds.length) {
      await ch.send({
        content: `${GIFT}  Congratulations ${winnerIds.map(w => `<@${w}>`).join(', ')}!`,
        embeds: [baseEmbed({
          title: '🥳  Winners Announced!',
          description: `**Prize:** 🎁 ${g.prize}\n**Winners:** ${winnerIds.map(w => `<@${w}>`).join(', ')}\n\nHost <@${g.hostId}> se contact karein prize claim karne ke liye.`,
          color: COLOR.success,
        })],
        reply: { messageReference: g.messageId, failIfNotExists: false },
      });
    } else {
      await ch.send({ embeds: [info(`Koi entries nahi aayi giveaway **${g.prize}** me. 😢`)] });
    }
  } catch (e) {
    console.error('End giveaway error:', e);
  }
}

export function startGiveawayTicker(client) {
  setInterval(async () => {
    const now = Date.now();
    const due = Object.values(db().giveaways).filter(g => !g.ended && g.endsAt <= now);
    for (const g of due) {
      try { await endGiveaway(client, g); } catch (e) { console.error(e); }
    }
  }, 5000);
}

export default [
  { data, execute },
  { data: endCmd, execute: executeEnd, autocomplete: endAutocomplete },
];
