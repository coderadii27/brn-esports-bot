import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } from 'discord.js';
import { err } from '../embed.js';

export async function handleButton(interaction) {
  const id = interaction.customId;
  if (id === 'tourney:create') return handleTourneyCreateOpen(interaction);
}

async function handleTourneyCreateOpen(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ embeds: [err('Aapke paas Manage Channels permission nahi hai.')], ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId('tourney-modal:create').setTitle('Create Tournament')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Tournament Name').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(2).setMaxLength(50).setPlaceholder('e.g. Summer Showdown 2026'),
    ));
  await interaction.showModal(modal);
}
