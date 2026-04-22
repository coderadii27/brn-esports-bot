import { baseEmbed, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';

// Find the tournament that owns this registration channel
function findTournamentByRegChannel(channelId) {
  for (const t of Object.values(db().tournaments)) {
    if (t.registrationChannelId === channelId) return t;
  }
  return null;
}

const REQUIRED = ['team name', 'team tag', 'captain', 'players', 'contact'];

function parseRegistration(content) {
  // Strip code fences
  let txt = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);

  const fields = {};
  let currentKey = null;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z\s]*?)\s*[:：]\s*(.*)$/);
    if (m) {
      currentKey = m[1].trim().toLowerCase();
      fields[currentKey] = m[2].trim();
    } else if (currentKey === 'players') {
      fields.players = (fields.players ? fields.players + '\n' : '') + line;
    }
  }

  const errors = [];
  for (const key of REQUIRED) {
    if (!fields[key] || fields[key].length === 0) errors.push(`Missing or empty: **${key}**`);
  }
  // Captain must mention
  if (fields.captain && !/<@!?\d+>/.test(fields.captain)) errors.push('**Captain** ko @mention karna zaroori hai.');

  // Tag length
  if (fields['team tag'] && (fields['team tag'].length < 2 || fields['team tag'].length > 6)) {
    errors.push('**Team Tag** 2-6 characters hona chahiye.');
  }

  // Players: must be at least 4 mentions
  let playerMentions = [];
  if (fields.players) {
    playerMentions = [...fields.players.matchAll(/<@!?(\d+)>/g)].map(m => m[1]);
    if (playerMentions.length < 4) errors.push(`**Players**: minimum 4 @mentioned players chahiye (mile ${playerMentions.length}).`);
  }

  // Captain id
  const captainMatch = fields.captain?.match(/<@!?(\d+)>/);
  const captainId = captainMatch?.[1];

  return {
    valid: errors.length === 0,
    errors,
    teamName: fields['team name'],
    teamTag: fields['team tag'],
    captainId,
    playerIds: playerMentions,
    substitute: fields.substitute,
    contact: fields.contact,
  };
}

export async function handleTournamentMessage(message) {
  if (message.author.bot || !message.guild) return;
  const t = findTournamentByRegChannel(message.channel.id);
  if (!t) return;

  // Ignore one-line / short messages (likely chat)
  if (message.content.length < 30 || !/team\s*name/i.test(message.content)) return;

  const parsed = parseRegistration(message.content);

  if (!parsed.valid) {
    await message.react('❌').catch(() => {});
    const e = baseEmbed({
      title: '❌  Registration Format Error',
      description: parsed.errors.map(x => `• ${x}`).join('\n') + `\n\nCorrect format dekho <#${t.formatChannelId}> me. Fix karke dobara post karo.`,
      color: COLOR.danger,
    });
    try { await message.reply({ embeds: [e], allowedMentions: { repliedUser: true } }); } catch {}
    return;
  }

  // Duplicate check (by team name)
  const dup = t.teams.find(x => x.teamName?.toLowerCase() === parsed.teamName.toLowerCase());
  if (dup) {
    await message.react('❌').catch(() => {});
    try {
      await message.reply({ embeds: [baseEmbed({ title: '❌  Duplicate Team', description: `**${parsed.teamName}** already registered hai.`, color: COLOR.danger })] });
    } catch {}
    return;
  }

  // Save & confirm
  const team = {
    teamName: parsed.teamName,
    teamTag: parsed.teamTag,
    captainId: parsed.captainId,
    playerIds: parsed.playerIds,
    substitute: parsed.substitute || null,
    contact: parsed.contact,
    registeredBy: message.author.id,
    messageId: message.id,
    registeredAt: Date.now(),
  };
  t.teams.push(team);
  markDirty();

  await message.react('✅').catch(() => {});

  // Post to confirm-teams
  const confirmCh = message.guild.channels.cache.get(t.confirmChannelId);
  if (confirmCh?.isTextBased()) {
    const e = baseEmbed({
      title: `${EMOJI.spark}  Team #${t.teams.length} Confirmed`,
      color: COLOR.success,
      fields: [
        { name: 'Team', value: `**${team.teamName}**  \`[${team.teamTag}]\``, inline: false },
        { name: 'Captain', value: `<@${team.captainId}>`, inline: true },
        { name: 'Players', value: team.playerIds.map((id, i) => `${i + 1}. <@${id}>`).join('\n'), inline: false },
        ...(team.substitute ? [{ name: 'Substitute', value: team.substitute, inline: true }] : []),
        { name: 'Contact', value: `\`${team.contact}\``, inline: true },
      ],
      footer: { text: `Registered by ${message.author.tag}` },
      timestamp: new Date().toISOString(),
    });
    try { await confirmCh.send({ embeds: [e] }); } catch {}
  }
}
