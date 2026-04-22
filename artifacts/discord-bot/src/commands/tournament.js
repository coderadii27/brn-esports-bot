import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';
import { paginate, sendPaginated } from '../pagination.js';

export const TOURNEY_CHANNELS = [
  { key: 'info',                 name: '📢│info',                 topic: 'Tournament overview & announcements' },
  { key: 'rules',                name: '📜│rules',                topic: 'Tournament rules — must read' },
  { key: 'updates',              name: '🆕│updates',              topic: 'Latest tournament updates' },
  { key: 'how-to-register',      name: '❓│how-to-register',      topic: 'Step-by-step registration guide' },
  { key: 'registration-format',  name: '📋│registration-format',  topic: 'Copy-paste this exact format to register' },
  { key: 'registration',         name: '📝│registration',         topic: 'Submit your team registration here' },
  { key: 'confirm-teams',        name: '✅│confirm-teams',        topic: 'Officially confirmed teams' },
  { key: 'roadmaps',             name: '🗺️│roadmaps',             topic: 'Tournament roadmap & bracket flow' },
  { key: 'schedule',             name: '📅│schedule',             topic: 'Match schedule & timings' },
  { key: 'point-table',          name: '🏆│point-table',          topic: 'Live points & standings' },
  { key: 'query',                name: '💬│query',                topic: 'Ask any question — staff will reply' },
];

function buildRegFormat(teamSize) {
  const lines = ['```yaml', 'Team Name: <your team name>', 'Team Tag: <2-5 letters>', 'Captain: @captain', 'Players:'];
  for (let i = 1; i <= teamSize; i++) lines.push(`  ${i}. @player${i}`);
  lines.push('Substitute: @sub  (optional)');
  lines.push('Contact: <discord/phone/email>');
  lines.push('```');
  return lines.join('\n');
}

const STARTER_CONTENT = {
  info: (t) => baseEmbed({
    title: `📢  ${t.name} — Information`,
    description: '**Welcome to the official tournament hub!**\n\nYahaan aapko tournament ki saari important info milegi — format, prize pool, schedule, aur sab kuch.\n\nNeeche channels ko explore karo aur stay tuned for updates.',
    color: COLOR.primary,
    fields: [
      { name: '🎮  Game', value: 'TBA', inline: true },
      { name: '👥  Team Size', value: `${t.teamSize} players`, inline: true },
      { name: '🎟️  Slots', value: `${t.slots} teams`, inline: true },
      { name: '🏆  Prize Pool', value: 'TBA', inline: true },
    ],
    footer: { text: 'Edit this message to add more details.' },
  }),
  rules: () => baseEmbed({
    title: '📜  Tournament Rules',
    color: COLOR.warning,
    description: [
      '**1.** Sab players ko fair play maintain karna hoga.',
      '**2.** Koi bhi cheating, hacking, ya scripting strictly band hai.',
      '**3.** Match time pe present hona compulsory hai (10 min grace period).',
      '**4.** Toxic behaviour aur abuse → instant disqualification.',
      '**5.** Streaming/recording allowed sirf approved platforms par.',
      '**6.** Admin/Mod ka decision final hoga.',
      '**7.** Roster lock-in ke baad changes allowed nahi.',
      '**8.** Substitute swap sirf match start se 5 min pehle allowed.',
      '**9.** Disconnections handle hone ka time max 5 min.',
      '**10.** Final dispute resolution sirf #query channel me.',
    ].join('\n'),
    footer: { text: 'Rules can be updated anytime — keep checking.' },
  }),
  updates: (t) => baseEmbed({ title: `🆕  ${t.name} — Updates`, description: 'Tournament ki sab latest updates yahaan post hongi. Notifications on rakho!', color: COLOR.info }),
  'how-to-register': (t) => baseEmbed({
    title: '❓  How to Register',
    color: COLOR.accent,
    description: [
      '**Step 1.** Open <#REG_FORMAT_ID> aur format copy karo.',
      '**Step 2.** <#REGISTRATION_ID> me jaake format paste karo apni team details ke saath.',
      '**Step 3.** Bot automatically format check karega aur ✅ react karega.',
      '**Step 4.** Confirmed teams <#CONFIRM_TEAMS_ID> me show hongi.',
      '**Step 5.** Galat format hua to bot ❌ react karke reason batayega — fix karke phir se post karo.',
      '',
      `**🎟️ Total slots:** ${t.slots} teams  •  **👥 Players per team:** ${t.teamSize}`,
      '',
      '**Pro tip:** Sab players ko @mention karo, plain names accept nahi honge. First-come-first-served basis pe slots fill honge.',
    ].join('\n'),
  }),
  'registration-format': (t) => baseEmbed({
    title: '📋  Registration Format',
    color: COLOR.accent,
    description: `Exact yahi format use karo. Copy → paste in <#REGISTRATION_ID> → fill karo.\n\n${buildRegFormat(t.teamSize)}\n\n**Required:** Team Name, Team Tag, Captain, Players (exactly **${t.teamSize}** @mentioned), Contact.\n**Optional:** Substitute.`,
  }),
  registration: (t) => baseEmbed({
    title: '📝  Submit Your Registration',
    color: COLOR.primary,
    description: `Apni team registration yahaan post karo using the exact format from <#REG_FORMAT_ID>.\n\nBot automatically validate karke ✅ ya ❌ react karega.\n\n**🎟️ Total slots:** ${t.slots} teams  •  **👥 Players per team:** ${t.teamSize}\n\n**Don't spam.** Ek team = ek registration.`,
  }),
  'confirm-teams': (t) => baseEmbed({
    title: '✅  Confirmed Teams',
    color: COLOR.success,
    description: `Officially confirmed teams ki list yahaan dikhegi (max **${t.slots}** teams). Jaise hi koi team approve hoti hai, automatically yahaan add ho jayegi.`,
  }),
  roadmaps: () => baseEmbed({
    title: '🗺️  Tournament Roadmap',
    color: COLOR.primary,
    description: [
      '**Phase 1 — Registration**     `Open Now`',
      '**Phase 2 — Team Confirmation** `TBA`',
      '**Phase 3 — Group Stage**       `TBA`',
      '**Phase 4 — Playoffs**          `TBA`',
      '**Phase 5 — Grand Finals**      `TBA`',
    ].join('\n'),
  }),
  schedule: () => baseEmbed({
    title: '📅  Match Schedule',
    color: COLOR.info,
    description: 'Match schedule yahaan publish hoga. Use `/tournament add-match` to add matches.',
  }),
  'point-table': () => baseEmbed({
    title: '🏆  Point Table',
    color: COLOR.gold,
    description: 'Live points yahaan update honge. Use `/tournament set-points` to update.\n```\n#  Team             W  L  Pts\n--------------------------------\n1.  —                0  0   0\n```',
  }),
  query: () => baseEmbed({ title: '💬  Ask Anything', color: COLOR.accent, description: 'Tournament ke baare me koi bhi question? Yahaan puchho — staff jaldi reply karega.' }),
};

function getTournament(id, guildId) {
  const t = db().tournaments[id];
  if (!t || t.guildId !== guildId) return null;
  return t;
}

function tournamentChoices(interaction) {
  // Returns autocomplete or static choices — for simplicity we allow free string and resolve later
  return null;
}

const data = new SlashCommandBuilder()
  .setName('tournament')
  .setDescription('Tournament organize system')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels.toString())
  .addSubcommand(s => s.setName('setup').setDescription('Pura tournament category + channels create karo')
    .addStringOption(o => o.setName('name').setDescription('Tournament ka naam').setRequired(true).setMaxLength(50))
    .addIntegerOption(o => o.setName('slots').setDescription('Total team slots').setRequired(true).setMinValue(2).setMaxValue(256))
    .addIntegerOption(o => o.setName('team-size').setDescription('Players per team').setRequired(true).setMinValue(1).setMaxValue(15)))
  .addSubcommand(s => s.setName('panel').setDescription('Setup panel button bhejo'))
  .addSubcommand(s => s.setName('list').setDescription('Iss server ke tournaments dekho'))
  .addSubcommand(s => s.setName('delete').setDescription('Tournament aur uska category delete karo')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true)))
  .addSubcommand(s => s.setName('announce').setDescription('Updates channel me announcement bhejo')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('message').setDescription('Announcement message').setRequired(true).setMaxLength(2000)))
  .addSubcommand(s => s.setName('teams').setDescription('Confirmed teams list dekho')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true)))
  .addSubcommand(s => s.setName('remove-team').setDescription('Ek registered team hatao')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('team').setDescription('Team name (case-insensitive)').setRequired(true)))
  .addSubcommand(s => s.setName('add-match').setDescription('Schedule channel me match add karo')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('round').setDescription('e.g. Group A, QF1, Finals').setRequired(true))
    .addStringOption(o => o.setName('team1').setDescription('Team 1').setRequired(true))
    .addStringOption(o => o.setName('team2').setDescription('Team 2').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('e.g. 22 Apr 8:00 PM IST').setRequired(true)))
  .addSubcommand(s => s.setName('set-points').setDescription('Point table update karo (markdown table)')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('table').setDescription('Pipe-separated rows: TeamA|3|1|9 ; TeamB|2|2|6').setRequired(true)))
  .addSubcommand(s => s.setName('lock').setDescription('Tournament channels ko private banao')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true)))
  .addSubcommand(s => s.setName('unlock').setDescription('Tournament channels public karo')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true)))
  .addSubcommand(s => s.setName('mvp').setDescription('Tournament MVP / champion declare karo (sundar embed)')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('champion').setDescription('Winning team name').setRequired(true))
    .addUserOption(o => o.setName('mvp').setDescription('MVP player').setRequired(true))
    .addStringOption(o => o.setName('prize').setDescription('Prize info').setRequired(false)));

async function autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== 'id') return interaction.respond([]);
  const all = Object.values(db().tournaments).filter(t => t.guildId === interaction.guild?.id);
  const q = focused.value.toLowerCase();
  const choices = all
    .filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    .slice(0, 25)
    .map(t => ({ name: `🏆 ${t.name} (${t.teams.length} teams)`.slice(0, 100), value: t.id }));
  return interaction.respond(choices);
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case 'panel':       return panel(interaction);
    case 'setup':       return setup(interaction, {
      name: interaction.options.getString('name'),
      slots: interaction.options.getInteger('slots'),
      teamSize: interaction.options.getInteger('team-size'),
    });
    case 'list':        return list(interaction);
    case 'delete':      return remove(interaction);
    case 'announce':    return announce(interaction);
    case 'teams':       return teams(interaction);
    case 'remove-team': return removeTeam(interaction);
    case 'add-match':   return addMatch(interaction);
    case 'set-points':  return setPoints(interaction);
    case 'lock':        return lockChannels(interaction, true);
    case 'unlock':      return lockChannels(interaction, false);
    case 'mvp':         return mvp(interaction);
  }
}

async function panel(interaction) {
  const e = baseEmbed({
    title: `${EMOJI.trophy}  Tournament Setup Panel`,
    description: 'Niche button dabaake ek complete tournament category banayein — saare 11 channels auto-create honge with starter embeds aur format-validation system.',
    color: COLOR.gold,
    fields: [
      { name: 'Channels created', value: TOURNEY_CHANNELS.map(c => `• ${c.name}`).join('\n').slice(0, 1000), inline: false },
      { name: 'Auto-features', value: '✅  Format-check on registration\n✅  Auto confirmation react\n✅  Auto-post to confirmed teams\n✅  Permission-locked channels', inline: false },
    ],
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tourney:create').setLabel('Create Tournament').setStyle(ButtonStyle.Success).setEmoji('🏆'),
  );
  await interaction.reply({ embeds: [e], components: [row] });
}

export async function setup(interaction, opts) {
  const name = typeof opts === 'string' ? opts : opts.name;
  const slots = Math.max(2, Math.min(256, Number(opts?.slots) || 16));
  const teamSize = Math.max(1, Math.min(15, Number(opts?.teamSize) || 4));

  if (!interaction.guild) return interaction.reply({ embeds: [err('Sirf server me chalega.')], ephemeral: true });
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ embeds: [err('Aapke paas Manage Channels permission nahi hai.')], ephemeral: true });
  }
  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels) || !me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({ embeds: [err('Bot ko **Manage Channels** aur **Manage Roles** permission chahiye.')], ephemeral: true });
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

  try {
    const category = await interaction.guild.channels.create({
      name: `🏆 ${name}`.slice(0, 100),
      type: ChannelType.GuildCategory,
    });

    const created = {};
    for (const ch of TOURNEY_CHANNELS) {
      const overwrites = [];
      if (!(ch.key === 'registration' || ch.key === 'query')) {
        overwrites.push({ id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] });
        overwrites.push({ id: me.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ManageMessages] });
      }
      const c = await interaction.guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: ch.topic,
        permissionOverwrites: overwrites,
      });
      created[ch.key] = c.id;
    }

    const tid = `${interaction.guild.id}:${category.id}`;
    const tObj = {
      id: tid, guildId: interaction.guild.id, name,
      slots, teamSize,
      categoryId: category.id, channels: created,
      registrationChannelId: created['registration'],
      confirmChannelId: created['confirm-teams'],
      formatChannelId: created['registration-format'],
      teams: [], createdAt: Date.now(), createdBy: interaction.user.id,
      registrationClosed: false,
    };
    db().tournaments[tid] = tObj;
    markDirty();

    const sub = (s) => s
      .replaceAll('REGISTRATION_ID', created['registration'])
      .replaceAll('REG_FORMAT_ID', created['registration-format'])
      .replaceAll('CONFIRM_TEAMS_ID', created['confirm-teams']);

    for (const ch of TOURNEY_CHANNELS) {
      const channel = interaction.guild.channels.cache.get(created[ch.key]);
      if (!channel) continue;
      const embed = STARTER_CONTENT[ch.key](tObj);
      if (embed.data.description) embed.setDescription(sub(embed.data.description));
      try { await channel.send({ embeds: [embed] }); } catch {}
    }

    const okEmbed = baseEmbed({
      title: `${EMOJI.spark}  Tournament Created!`,
      description: `**${name}** successfully setup ho gaya — <#${created['info']}> se start karo.\n\nID: \`${tid}\``,
      color: COLOR.success,
      fields: [
        { name: '🎟️ Slots', value: `${slots} teams`, inline: true },
        { name: '👥 Team Size', value: `${teamSize} players`, inline: true },
        { name: '📂 Category', value: `<#${category.id}>`, inline: true },
        { name: '📝 Registration', value: `<#${created['registration']}>`, inline: true },
        { name: '✅ Confirmed', value: `<#${created['confirm-teams']}>`, inline: true },
      ],
    });
    if (interaction.deferred) await interaction.editReply({ embeds: [okEmbed] });
    else await interaction.followUp({ embeds: [okEmbed], ephemeral: true });
  } catch (e) {
    console.error('Tournament setup error:', e);
    const msg = `Setup failed: ${e.message}`;
    if (interaction.deferred) await interaction.editReply({ embeds: [err(msg)] });
    else await interaction.reply({ embeds: [err(msg)], ephemeral: true });
  }
}

async function list(interaction) {
  const all = Object.values(db().tournaments).filter(t => t.guildId === interaction.guild.id);
  if (!all.length) return interaction.reply({ embeds: [info('Koi tournament nahi mila. `/tournament setup` se banao.')] });
  const desc = all.map(t => `🏆  **${t.name}** — ${t.teams.length} teams\nID: \`${t.id}\`  • Created <t:${Math.floor(t.createdAt / 1000)}:R>`).join('\n\n');
  return interaction.reply({ embeds: [baseEmbed({ title: 'Tournaments', description: desc, color: COLOR.gold })] });
}

async function remove(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  try {
    for (const cid of Object.values(t.channels)) {
      const c = interaction.guild.channels.cache.get(cid);
      if (c) await c.delete('Tournament removed').catch(() => {});
    }
    const cat = interaction.guild.channels.cache.get(t.categoryId);
    if (cat) await cat.delete('Tournament removed').catch(() => {});
    delete db().tournaments[t.id]; markDirty();
    await interaction.editReply({ embeds: [ok(`Tournament **${t.name}** delete ho gaya.`)] });
  } catch (e) {
    await interaction.editReply({ embeds: [err(`Delete failed: ${e.message}`)] });
  }
}

async function announce(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  const message = interaction.options.getString('message');
  const ch = interaction.guild.channels.cache.get(t.channels['updates']);
  if (!ch) return interaction.reply({ embeds: [err('Updates channel nahi mila.')], ephemeral: true });
  const e = baseEmbed({
    title: `📣  ${t.name} — Update`,
    description: message,
    color: COLOR.info,
    footer: { text: `Posted by ${interaction.user.tag}` },
  });
  try {
    await ch.send({ content: '@everyone', embeds: [e], allowedMentions: { parse: ['everyone'] } });
    await interaction.reply({ embeds: [ok(`Announcement posted in <#${ch.id}>.`)], ephemeral: true });
  } catch (e2) {
    await interaction.reply({ embeds: [err(`Failed: ${e2.message}`)], ephemeral: true });
  }
}

async function teams(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  if (!t.teams.length) return interaction.reply({ embeds: [info('Ek bhi team registered nahi hai abhi.')] });
  const pages = paginate(t.teams, 5);
  return sendPaginated(interaction, (items, idx, total) => baseEmbed({
    title: `${EMOJI.trophy}  ${t.name} — Teams (${t.teams.length})`,
    color: COLOR.gold,
    description: items.map((tm, i) => {
      const rank = idx * 5 + i + 1;
      return `**${rank}.  ${tm.teamName}**  \`[${tm.teamTag}]\`\n   👑 <@${tm.captainId}>  •  👥 ${tm.playerIds.length} players`;
    }).join('\n\n'),
    footer: { text: `Page ${idx + 1} / ${total}` },
  }), pages, 'tteams');
}

async function removeTeam(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  const name = interaction.options.getString('team').toLowerCase();
  const before = t.teams.length;
  t.teams = t.teams.filter(x => x.teamName?.toLowerCase() !== name);
  if (t.teams.length === before) return interaction.reply({ embeds: [err('Team nahi mili.')], ephemeral: true });
  markDirty();
  return interaction.reply({ embeds: [ok(`Team **${interaction.options.getString('team')}** hata di gayi.`)] });
}

async function addMatch(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  const ch = interaction.guild.channels.cache.get(t.channels['schedule']);
  if (!ch) return interaction.reply({ embeds: [err('Schedule channel nahi mila.')], ephemeral: true });
  const round = interaction.options.getString('round');
  const t1 = interaction.options.getString('team1');
  const t2 = interaction.options.getString('team2');
  const time = interaction.options.getString('time');
  const e = baseEmbed({
    title: `📅  ${round}`,
    color: COLOR.info,
    description: `### **${t1}**  🆚  **${t2}**\n\n🕒  \`${time}\``,
    footer: { text: `Be on time — 10 min grace period.` },
  });
  try {
    await ch.send({ embeds: [e] });
    await interaction.reply({ embeds: [ok('Match schedule me add ho gaya.')], ephemeral: true });
  } catch (e2) {
    await interaction.reply({ embeds: [err(`Failed: ${e2.message}`)], ephemeral: true });
  }
}

async function setPoints(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  const ch = interaction.guild.channels.cache.get(t.channels['point-table']);
  if (!ch) return interaction.reply({ embeds: [err('Point-table channel nahi mila.')], ephemeral: true });
  const raw = interaction.options.getString('table');
  // Parse: TeamA|3|1|9 ; TeamB|2|2|6
  const rows = raw.split(';').map(r => r.trim()).filter(Boolean).map(r => r.split('|').map(c => c.trim()));
  if (!rows.length) return interaction.reply({ embeds: [err('Koi valid row nahi mili.')], ephemeral: true });
  rows.sort((a, b) => Number(b[3] ?? 0) - Number(a[3] ?? 0));
  const lines = ['```', '#  Team                W   L   Pts', '----------------------------------'];
  rows.forEach((r, i) => {
    const team = (r[0] ?? '—').padEnd(18, ' ').slice(0, 18);
    lines.push(`${String(i + 1).padStart(2, ' ')} ${team} ${(r[1] ?? '0').padStart(3)} ${(r[2] ?? '0').padStart(3)} ${(r[3] ?? '0').padStart(4)}`);
  });
  lines.push('```');
  const e = baseEmbed({ title: `🏆  ${t.name} — Point Table`, description: lines.join('\n'), color: COLOR.gold });
  try {
    await ch.send({ embeds: [e] });
    await interaction.reply({ embeds: [ok('Point table updated.')], ephemeral: true });
  } catch (e2) {
    await interaction.reply({ embeds: [err(`Failed: ${e2.message}`)], ephemeral: true });
  }
}

async function lockChannels(interaction, lock) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const everyone = interaction.guild.roles.everyone.id;
  const me = interaction.guild.members.me;
  let updated = 0, failed = 0;
  for (const cid of Object.values(t.channels)) {
    const ch = interaction.guild.channels.cache.get(cid);
    if (!ch) continue;
    try {
      if (lock) {
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: `Tournament locked by ${interaction.user.tag}` });
        await ch.permissionOverwrites.edit(me.id, { ViewChannel: true, SendMessages: true });
      } else {
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: null }, { reason: `Tournament unlocked by ${interaction.user.tag}` });
      }
      updated++;
    } catch { failed++; }
  }
  const emoji = lock ? '🔒' : '🔓';
  const verb = lock ? 'locked (private)' : 'unlocked (public)';
  await interaction.editReply({ embeds: [baseEmbed({ title: `${emoji}  Tournament ${verb}`, description: `Updated: **${updated}** channels.${failed ? `\nFailed: ${failed}` : ''}`, color: lock ? COLOR.warning : COLOR.success })] });
}

async function mvp(interaction) {
  const t = getTournament(interaction.options.getString('id'), interaction.guild.id);
  if (!t) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  const champion = interaction.options.getString('champion');
  const mvpUser = interaction.options.getUser('mvp');
  const prize = interaction.options.getString('prize') ?? 'Glory & Bragging Rights';
  const ch = interaction.guild.channels.cache.get(t.channels['updates']) || interaction.channel;
  const e = baseEmbed({
    title: `🏆✨  GRAND CHAMPION  ✨🏆`,
    description: `# ${champion}\n\nAaj ke tournament ke vijeta!\n\n**🌟 MVP:** <@${mvpUser.id}>\n**🎁 Prize:** ${prize}\n\nSab teams ko participate karne ke liye thanks. Aap sab winners ho. ❤️`,
    color: COLOR.gold,
    thumbnail: mvpUser.displayAvatarURL({ size: 512 }),
    footer: { text: `${t.name} • Champion declared by ${interaction.user.tag}` },
  });
  try {
    await ch.send({ content: '@everyone', embeds: [e], allowedMentions: { parse: ['everyone'] } });
    await interaction.reply({ embeds: [ok('Champion declare ho gaya!')], ephemeral: true });
  } catch (e2) {
    await interaction.reply({ embeds: [err(`Failed: ${e2.message}`)], ephemeral: true });
  }
}

export default [{ data, execute, autocomplete }];
