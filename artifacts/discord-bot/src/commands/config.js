import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { getGuild, markDirty } from '../db.js';

const adminOnly = (i) => {
  if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    i.reply({ embeds: [err('Manage Server permission chahiye.')], ephemeral: true });
    return false;
  }
  return true;
};

export default [
  {
    data: new SlashCommandBuilder().setName('setwelcome').setDescription('Welcome channel set karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return;
      const ch = interaction.options.getChannel('channel');
      const g = getGuild(interaction.guildId); g.welcomeChannel = ch.id; markDirty();
      await interaction.reply({ embeds: [ok(`Welcome channel set to <#${ch.id}>.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('setlog').setDescription('Log channel set karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return;
      const ch = interaction.options.getChannel('channel');
      const g = getGuild(interaction.guildId); g.logChannel = ch.id; markDirty();
      await interaction.reply({ embeds: [ok(`Log channel set to <#${ch.id}>.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('setautorole').setDescription('Naye members ko role auto-assign').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return;
      const r = interaction.options.getRole('role');
      const g = getGuild(interaction.guildId); g.autoRole = r.id; markDirty();
      await interaction.reply({ embeds: [ok(`Auto-role set to <@&${r.id}>.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('setmodrole').setDescription('Mod role set karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return;
      const r = interaction.options.getRole('role');
      const g = getGuild(interaction.guildId); g.modRole = r.id; markDirty();
      await interaction.reply({ embeds: [ok(`Mod role set to <@&${r.id}>.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('settings-view').setDescription('Server settings dekho'),
    async execute(interaction) {
      const g = getGuild(interaction.guildId);
      const e = baseEmbed({
        title: `${EMOJI.tools}  Server Settings`,
        color: COLOR.primary,
        fields: [
          { name: 'Welcome Channel', value: g.welcomeChannel ? `<#${g.welcomeChannel}>` : '_not set_', inline: true },
          { name: 'Log Channel', value: g.logChannel ? `<#${g.logChannel}>` : '_not set_', inline: true },
          { name: 'Auto Role', value: g.autoRole ? `<@&${g.autoRole}>` : '_not set_', inline: true },
          { name: 'Mod Role', value: g.modRole ? `<@&${g.modRole}>` : '_not set_', inline: true },
        ],
      });
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('resetconfig').setDescription('Server settings reset karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      if (!adminOnly(interaction)) return;
      const g = getGuild(interaction.guildId);
      for (const k of Object.keys(g)) delete g[k];
      markDirty();
      await interaction.reply({ embeds: [ok('Settings reset ho gaye.')] });
    },
  },
];
