import { PermissionFlagsBits } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from './embed.js';

const PREFIX = '?';

const send = (msg, embed, opts = {}) => msg.channel.send({ embeds: [embed], ...opts }).catch(() => {});

function parseDuration(str) {
  const m = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const map = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
    h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
    d: 86_400_000, day: 86_400_000, days: 86_400_000,
    w: 604_800_000, week: 604_800_000, weeks: 604_800_000,
    mo: 2_592_000_000, month: 2_592_000_000, months: 2_592_000_000,
  };
  return n * map[m[2]];
}

function fmtDuration(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function firstUserId(args, mentions) {
  // Mentions first
  const m = mentions?.users?.first();
  if (m) return m.id;
  // Raw ID
  const idMatch = args.find(a => /^\d{17,20}$/.test(a));
  return idMatch ?? null;
}

const COMMANDS = {
  async purge(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return send(msg, err('Aapke paas Manage Messages permission nahi hai.'));
    if (!msg.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) return send(msg, err('Bot ko Manage Messages chahiye.'));

    const userId = firstUserId(args, msg.mentions);
    const numArg = args.find(a => /^\d+$/.test(a) && !/^\d{17,20}$/.test(a));
    const count = Math.min(100, Math.max(1, Number(numArg) || (userId ? 100 : 0)));
    if (!count) return send(msg, err('Usage: `?purge <1-100>` ya `?purge @user [1-100]`'));

    try {
      await msg.delete().catch(() => {});
      let messages = await msg.channel.messages.fetch({ limit: 100 });
      if (userId) messages = messages.filter(m => m.author.id === userId);
      const toDelete = [...messages.values()].slice(0, count);
      const fresh = toDelete.filter(m => Date.now() - m.createdTimestamp < 14 * 86_400_000);
      let deleted = 0;
      if (fresh.length) {
        const res = await msg.channel.bulkDelete(fresh, true);
        deleted = res.size;
      }
      const m = await send(msg, ok(`**${deleted}** message${deleted === 1 ? '' : 's'} delete kar diye.${userId ? ` (filter: <@${userId}>)` : ''}`, 'Purge'));
      setTimeout(() => m?.delete().catch(() => {}), 4000);
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async ban(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.BanMembers)) return send(msg, err('Aapke paas Ban Members permission nahi hai.'));
    if (!msg.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) return send(msg, err('Bot ko Ban Members chahiye.'));
    const userId = firstUserId(args, msg.mentions);
    if (!userId) return send(msg, err('Usage: `?ban @user <reason>`'));
    if (userId === msg.author.id) return send(msg, err('Apne aap ko ban nahi kar sakte.'));
    const reason = args.filter(a => !/^<@!?\d+>$/.test(a) && !/^\d{17,20}$/.test(a)).join(' ') || 'No reason provided';
    try {
      const member = await msg.guild.members.fetch(userId).catch(() => null);
      if (member && !member.bannable) return send(msg, err('Bot ye user ko ban nahi kar sakta (role hierarchy).'));
      await msg.guild.bans.create(userId, { reason: `${reason} • By ${msg.author.tag}` });
      await send(msg, baseEmbed({ title: '🔨  User Banned', description: `<@${userId}> ko ban kar diya.`, color: COLOR.danger, fields: [{ name: 'Reason', value: reason }, { name: 'Moderator', value: `<@${msg.author.id}>`, inline: true }] }));
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async kick(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.KickMembers)) return send(msg, err('Aapke paas Kick Members permission nahi hai.'));
    if (!msg.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) return send(msg, err('Bot ko Kick Members chahiye.'));
    const userId = firstUserId(args, msg.mentions);
    if (!userId) return send(msg, err('Usage: `?kick @user <reason>`'));
    const reason = args.filter(a => !/^<@!?\d+>$/.test(a) && !/^\d{17,20}$/.test(a)).join(' ') || 'No reason provided';
    try {
      const member = await msg.guild.members.fetch(userId).catch(() => null);
      if (!member) return send(msg, err('User server me nahi mila.'));
      if (!member.kickable) return send(msg, err('Bot ye user ko kick nahi kar sakta (role hierarchy).'));
      await member.kick(`${reason} • By ${msg.author.tag}`);
      await send(msg, baseEmbed({ title: '👢  User Kicked', description: `<@${userId}> ko kick kar diya.`, color: COLOR.warning, fields: [{ name: 'Reason', value: reason }, { name: 'Moderator', value: `<@${msg.author.id}>`, inline: true }] }));
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async mute(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return send(msg, err('Aapke paas Timeout Members permission nahi hai.'));
    if (!msg.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) return send(msg, err('Bot ko Timeout Members chahiye.'));
    const userId = firstUserId(args, msg.mentions);
    if (!userId) return send(msg, err('Usage: `?mute @user <duration> [reason]`  e.g. `?mute @x 10m spamming`'));
    const remaining = args.filter(a => !/^<@!?\d+>$/.test(a) && !/^\d{17,20}$/.test(a));
    const durStr = remaining[0];
    const ms = parseDuration(durStr);
    if (!ms) return send(msg, err('Duration galat hai. Examples: `30s`, `10m`, `2h`, `1d`, `1mo`'));
    const cap = 28 * 86_400_000;
    const duration = Math.min(ms, cap);
    const reason = remaining.slice(1).join(' ') || 'No reason provided';
    try {
      const member = await msg.guild.members.fetch(userId).catch(() => null);
      if (!member) return send(msg, err('User server me nahi mila.'));
      if (!member.moderatable) return send(msg, err('Bot ye user ko mute nahi kar sakta (role hierarchy).'));
      await member.timeout(duration, `${reason} • By ${msg.author.tag}`);
      await send(msg, baseEmbed({
        title: '🔇  User Muted',
        description: `<@${userId}> ko **${fmtDuration(duration)}** ke liye mute kar diya.${ms > cap ? '\n_(Discord ka max timeout 28 days hai.)_' : ''}`,
        color: COLOR.warning,
        fields: [{ name: 'Reason', value: reason }, { name: 'Moderator', value: `<@${msg.author.id}>`, inline: true }, { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true }],
      }));
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async unmute(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return send(msg, err('Aapke paas Timeout Members permission nahi hai.'));
    const userId = firstUserId(args, msg.mentions);
    if (!userId) return send(msg, err('Usage: `?unmute @user [reason]`'));
    const reason = args.filter(a => !/^<@!?\d+>$/.test(a) && !/^\d{17,20}$/.test(a)).join(' ') || 'No reason provided';
    try {
      const member = await msg.guild.members.fetch(userId).catch(() => null);
      if (!member) return send(msg, err('User server me nahi mila.'));
      await member.timeout(null, `${reason} • By ${msg.author.tag}`);
      await send(msg, baseEmbed({ title: '🔊  User Unmuted', description: `<@${userId}> ka mute hata diya.`, color: COLOR.success, fields: [{ name: 'Reason', value: reason }, { name: 'Moderator', value: `<@${msg.author.id}>`, inline: true }] }));
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async anc(msg, args) {
    if (!msg.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return send(msg, err('Aapke paas Manage Messages permission nahi hai.'));
    const text = args.join(' ').trim();
    if (!text) return send(msg, err('Usage: `?anc <announcement text>`'));
    try {
      await msg.delete().catch(() => {});
      const e = baseEmbed({
        title: '📣  Announcement',
        description: text,
        color: COLOR.info,
        author: { name: msg.author.username, iconURL: msg.author.displayAvatarURL() },
        footer: { text: `Announced by ${msg.author.tag}` },
      });
      await msg.channel.send({ content: '@everyone', embeds: [e], allowedMentions: { parse: ['everyone'] } });
    } catch (e) { send(msg, err(`Failed: ${e.message}`)); }
  },

  async help(msg) {
    return send(msg, baseEmbed({
      title: `${EMOJI.tools}  Prefix Commands`,
      color: COLOR.primary,
      description: [
        `**${PREFIX}purge** \`<1-100>\`  •  \`@user [1-100]\`  — bulk delete`,
        `**${PREFIX}ban** \`@user <reason>\``,
        `**${PREFIX}kick** \`@user <reason>\``,
        `**${PREFIX}mute** \`@user <duration> [reason]\`  — duration: 30s / 10m / 2h / 1d / 1mo`,
        `**${PREFIX}unmute** \`@user [reason]\``,
        `**${PREFIX}anc** \`<text>\`  — announcement (deletes your message)`,
        '',
        '**Slash commands:**',
        '`/tournament setup • panel • list • announce • teams • add-match • set-points • lock • unlock • mvp • remove-team • delete`',
        '`/gstart` — start giveaway  •  `/gend` — end early',
      ].join('\n'),
    }));
  },
};

// Aliases
COMMANDS.timeout = COMMANDS.mute;
COMMANDS.untimeout = COMMANDS.unmute;
COMMANDS.announce = COMMANDS.anc;
COMMANDS.clear = COMMANDS.purge;
COMMANDS.clean = COMMANDS.purge;

export async function handlePrefix(msg) {
  if (msg.author.bot || !msg.guild) return;
  if (!msg.content.startsWith(PREFIX)) return;
  const raw = msg.content.slice(PREFIX.length).trim();
  if (!raw) return;
  const [cmd, ...args] = raw.split(/\s+/);
  const handler = COMMANDS[cmd.toLowerCase()];
  if (!handler) return;
  try { await handler(msg, args); }
  catch (e) { console.error('Prefix cmd error:', e); send(msg, err(`Error: ${e.message}`)); }
}
