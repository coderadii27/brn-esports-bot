import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { _hang, _guess } from '../commands/games.js';

export async function handleModal(interaction) {
  const id = interaction.customId;
  if (id.startsWith('guess-modal:')) return handleGuess(interaction);
  if (id.startsWith('hang-modal:')) return handleHang(interaction);
}

async function handleGuess(interaction) {
  const [, gameId] = interaction.customId.split(':');
  const game = _guess.GUESS_GAMES.get(gameId);
  if (!game) return interaction.reply({ embeds: [err('Game expired.')], ephemeral: true });
  const n = Number(interaction.fields.getTextInputValue('num'));
  if (!Number.isFinite(n) || n < 1 || n > 100) return interaction.reply({ embeds: [err('1 se 100 ke beech number daalein.')], ephemeral: true });
  game.attempts++;
  if (n === game.target) {
    _guess.GUESS_GAMES.delete(gameId);
    return interaction.reply({ embeds: [baseEmbed({ title: '🎉  Correct!', description: `Number tha **${game.target}** — \`${game.attempts}\` attempts me guess kiya!`, color: COLOR.success })] });
  }
  const hint = n < game.target ? '⬆️  Higher' : '⬇️  Lower';
  await interaction.reply({ embeds: [baseEmbed({ title: `${hint}`, description: `Attempts: \`${game.attempts}\`. Try again with the button.`, color: COLOR.warning })], ephemeral: true });
}

async function handleHang(interaction) {
  const [, gameId] = interaction.customId.split(':');
  const game = _hang.HANG_GAMES.get(gameId);
  if (!game) return interaction.reply({ embeds: [err('Game expired.')], ephemeral: true });
  const letter = interaction.fields.getTextInputValue('letter').toLowerCase();
  if (!/^[a-z]$/.test(letter)) return interaction.reply({ embeds: [err('Sirf ek letter allowed hai.')], ephemeral: true });
  if (game.guessed.has(letter)) return interaction.reply({ embeds: [info(`Ye letter pehle guess ho chuka.`)], ephemeral: true });
  game.guessed.add(letter);
  if (!game.word.includes(letter)) game.wrong++;
  const masked = game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ');
  const wrongList = [...game.guessed].filter(l => !game.word.includes(l)).join(', ') || '—';
  const won = !masked.includes('_');
  const lost = game.wrong >= 6;
  const desc = `\`${masked}\`\nWrong (${game.wrong}/6): \`${wrongList}\``;
  if (won) { _hang.HANG_GAMES.delete(gameId); return interaction.reply({ embeds: [baseEmbed({ title: '🎉  You won!', description: `Word tha **${game.word}**.`, color: COLOR.success })] }); }
  if (lost) { _hang.HANG_GAMES.delete(gameId); return interaction.reply({ embeds: [baseEmbed({ title: '💀  Game over', description: `Word tha **${game.word}**.`, color: COLOR.danger })] }); }
  await interaction.reply({ embeds: [baseEmbed({ title: '🪢  Hangman', description: desc, color: COLOR.warning })], ephemeral: true });
}
