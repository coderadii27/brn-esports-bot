import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';

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

const REG_FORMAT = [
  '```yaml',
  'Team Name: <your team name>',
  'Team Tag: <2-5 letters>',
  'Captain: @captain',
  'Players:',
  '  1. @player1',
  '  2. @player2',
  '  3. @player3',
  '  4. @player4',
  'Substitute: @sub  (optional)',
  'Contact: <discord/phone/email>',
  '```',
].join('\n');

const STARTER_CONTENT = {
  info: () => baseEmbed({
    title: '📢  Tournament Information',
    description: '**Welcome to the official tournament hub!**\n\nYahaan aapko tournament ki saari important info milegi — format, prize pool, schedule, aur sab kuch.\n\nNeeche channels ko explore karo aur stay tuned for updates.',
    color: COLOR.primary,
    fields: [
      { name: '🎮  Game', value: 'TBA', inline: true },
      { name: '👥  Format', value: 'TBA', inline: true },
      { name: '🏆  Prize Pool', value: 'TBA', inline: true },
    ],
    footer: { text: 'Edit this message to add tournament details.' },
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
  updates: () => baseEmbed({
    title: '🆕  Updates',
    description: 'Tournament ki sab latest updates yahaan post hongi. Notifications on rakho!',
    color: COLOR.info,
  }),
  'how-to-register': () => baseEmbed({
    title: '❓  How to Register',
    color: COLOR.accent,
    description: [
      '**Step 1.** Open <#REG_FORMAT_ID> aur format copy karo.',
      '**Step 2.** <#REGISTRATION_ID> me jaake format paste karo apni team details ke saath.',
      '**Step 3.** Bot automatically format check karega aur ✅ react karega.',
      '**Step 4.** Confirmed teams <#CONFIRM_TEAMS_ID> me show hongi.',
      '**Step 5.** Galat format hua to bot ❌ react karke reason batayega — fix karke phir se post karo.',
      '',
      '**Pro tip:** Sab players ko @mention karo, plain names accept nahi honge.',
    ].join('\n'),
  }),
  'registration-format': () => baseEmbed({
    title: '📋  Registration Format',
    color: COLOR.accent,
    description: `Exact yahi format use karo. Copy → paste in <#REGISTRATION_ID> → fill karo.\n\n${REG_FORMAT}\n\n**Required fields:** Team Name, Team Tag, Captain, Players (min 4), Contact.\n**Optional:** Substitute.`,
  }),
  registration: () => baseEmbed({
    title: '📝  Submit Your Registration',
    color: COLOR.primary,
    description: `Apni team registration yahaan post karo using the exact format from <#REG_FORMAT_ID>.\n\nBot automatically validate karke ✅ ya ❌ react karega.\n\n**Don't spam.** Ek team = ek registration.`,
  }),
  'confirm-teams': () => baseEmbed({
    title: '✅  Confirmed Teams',
    color: COLOR.success,
    description: 'Officially confirmed teams ki list yahaan dikhegi. Jaise hi koi team approve hoti hai, automatically yahaan add ho jayegi.',
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
    description: 'Match schedule yahaan publish hoga. Format:\n```\nDay X • HH:MM IST\nTeam A  vs  Team B\n```',
  }),
  'point-table': () => baseEmbed({
    title: '🏆  Point Table',
    color: COLOR.gold,
    description: 'Live points yahaan update honge.\n```\n#  Team             W  L  Pts\n--------------------------------\n1.  —                0  0   0\n```',
  }),
  query: () => baseEmbed({
    title: '💬  Ask Anything',
    color: COLOR.accent,
    description: 'Tournament ke baare me koi bhi question? Yahaan puchho — staff jaldi reply karega.',
  }),
};

const data = new SlashCommandBuilder()
  .setName('tournament')
  .setDescription('Tournament organize system')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels.toString())
  .addSubcommand(s => s.setName('setup').setDescription('Pura tournament category + channels create karo')
    .addStringOption(o => o.setName('name').setDescription('Tournament ka naam').setRequired(true).setMaxLength(50)))
  .addSubcommand(s => s.setName('panel').setDescription('Setup panel button bhejo (admin trigger)'))
  .addSubcommand(s => s.setName('list').setDescription('Iss server ke tournaments dekho'))
  .addSubcommand(s => s.setName('delete').setDescription('Tournament aur uska category delete karo')
    .addStringOption(o => o.setName('id').setDescription('Tournament ID').setRequired(true)));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'panel') return panel(interaction);
  if (sub === 'setup') return setup(interaction, interaction.options.getString('name'));
  if (sub === 'list') return list(interaction);
  if (sub === 'delete') return remove(interaction);
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

export async function setup(interaction, name) {
  if (!interaction.guild) return interaction.reply({ embeds: [err('Sirf server me chalega.')], ephemeral: true });
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ embeds: [err('Aapke paas Manage Channels permission nahi hai.')], ephemeral: true });
  }
  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels) || !me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({ embeds: [err('Bot ko **Manage Channels** aur **Manage Roles** permission chahiye.')], ephemeral: true });
  }
  const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'deferReply';
  if (replyMethod === 'deferReply') await interaction.deferReply({ ephemeral: true });

  try {
    const category = await interaction.guild.channels.create({
      name: `🏆 ${name}`.slice(0, 100),
      type: ChannelType.GuildCategory,
    });

    const created = {};
    for (const ch of TOURNEY_CHANNELS) {
      const overwrites = [];
      if (ch.key === 'registration' || ch.key === 'query') {
        // public read+write
      } else if (ch.key === 'confirm-teams' || ch.key === 'updates' || ch.key === 'point-table' || ch.key === 'schedule' || ch.key === 'roadmaps' || ch.key === 'info' || ch.key === 'rules' || ch.key === 'how-to-register' || ch.key === 'registration-format') {
        // read-only for everyone, bot writes
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

    // Save tournament
    const tid = `${interaction.guild.id}:${category.id}`;
    db().tournaments[tid] = {
      id: tid,
      guildId: interaction.guild.id,
      name,
      categoryId: category.id,
      channels: created,
      registrationChannelId: created['registration'],
      confirmChannelId: created['confirm-teams'],
      formatChannelId: created['registration-format'],
      teams: [],
      createdAt: Date.now(),
      createdBy: interaction.user.id,
    };
    markDirty();

    // Post starter embeds
    const sub = (s) => s
      .replaceAll('REGISTRATION_ID', created['registration'])
      .replaceAll('REG_FORMAT_ID', created['registration-format'])
      .replaceAll('CONFIRM_TEAMS_ID', created['confirm-teams']);

    for (const ch of TOURNEY_CHANNELS) {
      const channel = interaction.guild.channels.cache.get(created[ch.key]);
      if (!channel) continue;
      const embed = STARTER_CONTENT[ch.key]();
      // String-substitute channel ID placeholders
      if (embed.data.description) embed.setDescription(sub(embed.data.description));
      try {
        await channel.send({ embeds: [embed] });
      } catch {}
    }

    const okEmbed = baseEmbed({
      title: `${EMOJI.spark}  Tournament Created!`,
      description: `**${name}** successfully setup ho gaya — <#${created['info']}> se start karo.\n\nID: \`${tid}\``,
      color: COLOR.success,
      fields: [
        { name: 'Category', value: `<#${category.id}>`, inline: true },
        { name: 'Registration', value: `<#${created['registration']}>`, inline: true },
        { name: 'Confirm Teams', value: `<#${created['confirm-teams']}>`, inline: true },
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
  const id = interaction.options.getString('id');
  const t = db().tournaments[id];
  if (!t || t.guildId !== interaction.guild.id) return interaction.reply({ embeds: [err('Tournament nahi mila.')], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  try {
    for (const cid of Object.values(t.channels)) {
      const c = interaction.guild.channels.cache.get(cid);
      if (c) await c.delete('Tournament removed').catch(() => {});
    }
    const cat = interaction.guild.channels.cache.get(t.categoryId);
    if (cat) await cat.delete('Tournament removed').catch(() => {});
    delete db().tournaments[id]; markDirty();
    await interaction.editReply({ embeds: [ok(`Tournament **${t.name}** delete ho gaya.`)] });
  } catch (e) {
    await interaction.editReply({ embeds: [err(`Delete failed: ${e.message}`)] });
  }
}

export default [{ data, execute }];
