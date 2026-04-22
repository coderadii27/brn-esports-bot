import { setup as tourneySetup } from '../commands/tournament.js';

export async function handleModal(interaction) {
  if (interaction.customId === 'tourney-modal:create') {
    const name = interaction.fields.getTextInputValue('name').trim();
    return tourneySetup(interaction, name);
  }
}
