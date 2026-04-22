import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { baseEmbed, COLOR, EMOJI, info, err } from '../embed.js';

const fmt = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${d}d ${h}h ${m}m ${sec}s`;
};

export default [
  {
    data: new SlashCommandBuilder().setName('ping').setDescription('Bot ki latency check karein'),
    async execute(interaction) {
      const sent = await interaction.reply({ embeds: [info('Pinging…', 'Ping')], fetchReply: true });
      const rt = sent.createdTimestamp - interaction.createdTimestamp;
      const ws = interaction.client.ws.ping;
      const e = baseEmbed({
        title: `${EMOJI.ping}  Pong!`,
        color: COLOR.info,
        fields: [
          { name: 'Roundtrip', value: `\`${rt}ms\``, inline: true },
          { name: 'WebSocket', value: `\`${ws}ms\``, inline: true },
          { name: 'Status', value: ws < 200 ? '🟢 Excellent' : ws < 400 ? '🟡 Good' : '🔴 Slow', inline: true },
        ],
      });
      await interaction.editReply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('botinfo').setDescription('Bot ke baare me jaanein'),
    async execute(interaction) {
      const c = interaction.client;
      const e = baseEmbed({
        title: `${EMOJI.spark}  ${c.user.username}`,
        thumbnail: c.user.displayAvatarURL({ size: 256 }),
        description: '*A premium, all-in-one Discord experience.*',
        color: COLOR.primary,
        fields: [
          { name: 'Servers', value: `\`${c.guilds.cache.size}\``, inline: true },
          { name: 'Users', value: `\`${c.users.cache.size}\``, inline: true },
          { name: 'Commands', value: `\`${c.commands.size}\``, inline: true },
          { name: 'Library', value: `discord.js v${djsVersion}`, inline: true },
          { name: 'Node', value: process.version, inline: true },
          { name: 'Uptime', value: fmt(process.uptime()), inline: true },
        ],
      });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('uptime').setDescription('Bot kitni der se chal raha hai'),
    async execute(interaction) {
      await interaction.reply({ embeds: [info(`\`${fmt(process.uptime())}\``, 'Uptime')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Iss server ki details'),
    async execute(interaction) {
      const g = interaction.guild;
      if (!g) return interaction.reply({ embeds: [err('Ye command sirf server me chalegi.')], ephemeral: true });
      await g.fetch();
      const owner = await g.fetchOwner().catch(() => null);
      const e = baseEmbed({
        title: `${EMOJI.star}  ${g.name}`,
        thumbnail: g.iconURL({ size: 256 }) ?? undefined,
        color: COLOR.accent,
        fields: [
          { name: 'Owner', value: owner ? `<@${owner.id}>` : 'Unknown', inline: true },
          { name: 'Members', value: `\`${g.memberCount}\``, inline: true },
          { name: 'Boosts', value: `\`${g.premiumSubscriptionCount ?? 0}\` (Tier ${g.premiumTier})`, inline: true },
          { name: 'Channels', value: `\`${g.channels.cache.size}\``, inline: true },
          { name: 'Roles', value: `\`${g.roles.cache.size}\``, inline: true },
          { name: 'Emojis', value: `\`${g.emojis.cache.size}\``, inline: true },
          { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: false },
        ],
      });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('userinfo').setDescription('User ki details')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const u = interaction.options.getUser('user') ?? interaction.user;
      const m = await interaction.guild?.members.fetch(u.id).catch(() => null);
      const e = baseEmbed({
        title: `${EMOJI.info}  ${u.username}`,
        thumbnail: u.displayAvatarURL({ size: 256 }),
        color: COLOR.info,
        fields: [
          { name: 'ID', value: `\`${u.id}\``, inline: true },
          { name: 'Bot', value: u.bot ? 'Yes' : 'No', inline: true },
          { name: 'Created', value: `<t:${Math.floor(u.createdTimestamp / 1000)}:R>`, inline: false },
        ],
      });
      if (m) {
        e.addFields(
          { name: 'Joined', value: `<t:${Math.floor((m.joinedTimestamp ?? 0) / 1000)}:R>`, inline: false },
          { name: 'Roles', value: m.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).slice(0, 20).join(' ') || 'None' },
        );
      }
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('avatar').setDescription('User ka avatar dikhayein')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const u = interaction.options.getUser('user') ?? interaction.user;
      const url = u.displayAvatarURL({ size: 1024 });
      const e = baseEmbed({ title: `${u.username}'s avatar`, image: url, color: COLOR.accent, url });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('banner').setDescription('User ka banner dikhayein')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const u = await (interaction.options.getUser('user') ?? interaction.user).fetch();
      const url = u.bannerURL({ size: 1024 });
      if (!url) return interaction.reply({ embeds: [info('Iss user ka koi banner nahi hai.')], ephemeral: true });
      await interaction.reply({ embeds: [baseEmbed({ title: `${u.username}'s banner`, image: url, color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('roleinfo').setDescription('Role ki details')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) {
      const r = interaction.options.getRole('role');
      const e = baseEmbed({
        title: `${EMOJI.star}  ${r.name}`,
        color: r.color || COLOR.primary,
        fields: [
          { name: 'ID', value: `\`${r.id}\``, inline: true },
          { name: 'Color', value: r.hexColor, inline: true },
          { name: 'Mentionable', value: r.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Hoisted', value: r.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Position', value: `${r.position}`, inline: true },
          { name: 'Members', value: `${r.members.size}`, inline: true },
        ],
      });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('channelinfo').setDescription('Channel ki details')
      .addChannelOption(o => o.setName('channel').setDescription('Channel')),
    async execute(interaction) {
      const ch = interaction.options.getChannel('channel') ?? interaction.channel;
      const e = baseEmbed({
        title: `# ${ch.name}`,
        color: COLOR.info,
        fields: [
          { name: 'ID', value: `\`${ch.id}\``, inline: true },
          { name: 'Type', value: `${ch.type}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:R>`, inline: false },
        ],
      });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('emojis').setDescription('Server ke emojis dikhayein'),
    async execute(interaction) {
      const g = interaction.guild;
      if (!g) return interaction.reply({ embeds: [err('Ye command sirf server me chalegi.')], ephemeral: true });
      const list = g.emojis.cache.map(e => `${e}`).join(' ').slice(0, 4000) || 'No emojis.';
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.spark}  ${g.name} emojis (${g.emojis.cache.size})`, description: list, color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('members').setDescription('Server members count'),
    async execute(interaction) {
      const g = interaction.guild;
      if (!g) return interaction.reply({ embeds: [err('Ye command sirf server me chalegi.')], ephemeral: true });
      await g.members.fetch().catch(() => {});
      const total = g.memberCount;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      const humans = total - bots;
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.star}  Members`, color: COLOR.accent, fields: [
        { name: 'Total', value: `\`${total}\``, inline: true },
        { name: 'Humans', value: `\`${humans}\``, inline: true },
        { name: 'Bots', value: `\`${bots}\``, inline: true },
      ] })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('invite').setDescription('Bot ko apne server me add karne ka link'),
    async execute(interaction) {
      const id = interaction.client.user.id;
      const url = `https://discord.com/oauth2/authorize?client_id=${id}&permissions=8&scope=bot%20applications.commands`;
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.spark}  Add me to your server`, description: `[Click here to invite](${url})`, color: COLOR.primary, url })], ephemeral: true });
    },
  },
];
