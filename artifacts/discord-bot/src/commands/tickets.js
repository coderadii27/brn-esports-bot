import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, getGuild, markDirty } from '../db.js';

export default [
  {
    data: new SlashCommandBuilder().setName('ticket-setup').setDescription('Ticket panel set karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ embeds: [err('Manage Server permission chahiye.')], ephemeral: true });
      const e = baseEmbed({
        title: '🎫  Support Tickets',
        description: 'Need help? Apna ticket open karein. Hum jald reply karenge.\n\nBas neeche ka button click karein.',
        color: COLOR.primary,
      });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
      await interaction.reply({ embeds: [e], components: [row] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('ticket-open').setDescription('Naya support ticket open karein'),
    async execute(interaction) {
      const g = interaction.guild;
      const existing = g.channels.cache.find(c => c.name === `ticket-${interaction.user.id.slice(-6)}`);
      if (existing) return interaction.reply({ embeds: [info(`Aapka ticket already open hai: <#${existing.id}>`)], ephemeral: true });
      try {
        const ch = await g.channels.create({
          name: `ticket-${interaction.user.id.slice(-6)}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: g.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
            { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
          ],
        });
        db().tickets[ch.id] = { userId: interaction.user.id, openedAt: Date.now() };
        markDirty();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
        await ch.send({ content: `<@${interaction.user.id}>`, embeds: [baseEmbed({ title: '🎫  Ticket opened', description: 'Ek staff member jald aayega. Apna issue describe karein.', color: COLOR.success })], components: [row] });
        await interaction.reply({ embeds: [ok(`Ticket created: <#${ch.id}>`)], ephemeral: true });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('ticket-close').setDescription('Ticket close karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const t = db().tickets[interaction.channel.id];
      if (!t) return interaction.reply({ embeds: [err('Ye ticket channel nahi hai.')], ephemeral: true });
      await interaction.reply({ embeds: [ok('Ticket 5 seconds me close hoga…')] });
      setTimeout(async () => {
        try {
          delete db().tickets[interaction.channel.id]; markDirty();
          await interaction.channel.delete('Ticket closed');
        } catch {}
      }, 5000);
    },
  },
  {
    data: new SlashCommandBuilder().setName('ticket-add').setDescription('User ko ticket me add karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    async execute(interaction) {
      const u = interaction.options.getUser('user');
      try {
        await interaction.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.reply({ embeds: [ok(`<@${u.id}> ko ticket me add kar diya.`)] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
];
