import { setup as tourneySetup } from '../commands/tournament.js';

export async function handleModal(interaction) {
  if (interaction.customId === 'tourney-modal:create') {
    const name = interaction.fields.getTextInputValue('name').trim();
    const slots = parseInt(interaction.fields.getTextInputValue('slots').trim(), 10);
    const teamSize = parseInt(interaction.fields.getTextInputValue('teamSize').trim(), 10);
    if (!Number.isFinite(slots) || slots < 2 || slots > 256) {
      return interaction.reply({ content: '❌ Slots ek number hona chahiye (2-256).', ephemeral: true });
    }
    if (!Number.isFinite(teamSize) || teamSize < 1 || teamSize > 15) {
      return interaction.reply({ content: '❌ Team size ek number hona chahiye (1-15).', ephemeral: true });
    }
    return tourneySetup(interaction, { name, slots, teamSize });
  }
}
