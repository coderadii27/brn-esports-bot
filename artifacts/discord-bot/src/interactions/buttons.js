import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, getEconomy, markDirty } from '../db.js';
import { _ttt, _hang, _guess } from '../commands/games.js';

export async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith('ttt:')) return handleTTT(interaction);
  if (id.startsWith('guess:')) return handleGuessOpen(interaction);
  if (id.startsWith('hang:')) return handleHangOpen(interaction);
  if (id.startsWith('trivia:')) return handleTrivia(interaction);
  if (id === 'ticket:open') return handleTicketOpen(interaction);
  if (id === 'ticket:close') return handleTicketClose(interaction);
  if (id === 'tourney:create') return handleTourneyCreateOpen(interaction);
  // pagination handled inside its own collector — ignore here
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

async function handleTTT(interaction) {
  const [, gameId, idxStr] = interaction.customId.split(':');
  const idx = Number(idxStr);
  const game = _ttt.TTT_GAMES.get(gameId);
  if (!game) return interaction.reply({ embeds: [err('Game expired ya nahi mila.')], ephemeral: true });
  if (interaction.user.id !== game.user) return interaction.reply({ embeds: [err('Ye game aapka nahi hai.')], ephemeral: true });
  if (game.board[idx] !== 0) return interaction.deferUpdate();
  game.board[idx] = 1;
  let win = _ttt.ttWinner(game.board);
  if (!win) {
    const empty = game.board.map((c, i) => c === 0 ? i : -1).filter(i => i >= 0);
    let move = empty[Math.floor(Math.random() * empty.length)];
    for (const i of empty) { const t = [...game.board]; t[i] = 2; if (_ttt.ttWinner(t) === 2) { move = i; break; } }
    for (const i of empty) { const t = [...game.board]; t[i] = 1; if (_ttt.ttWinner(t) === 1) { move = i; break; } }
    game.board[move] = 2;
    win = _ttt.ttWinner(game.board);
  }
  const desc = `${_ttt.ttRender(game.board)}\n\n${win === 1 ? '🎉  **You win!**' : win === 2 ? '💀  **Bot wins!**' : win === -1 ? '🤝  **Draw!**' : 'Aapka turn — cell choose karein.'}`;
  await interaction.update({ embeds: [baseEmbed({ title: `${EMOJI.game}  Tic Tac Toe`, description: desc, color: win === 1 ? COLOR.success : win === 2 ? COLOR.danger : win === -1 ? COLOR.warning : COLOR.primary })], components: win ? [] : _ttt.ttRow(game.board, gameId) });
  if (win) _ttt.TTT_GAMES.delete(gameId);
}

async function handleGuessOpen(interaction) {
  const [, gameId] = interaction.customId.split(':');
  const game = _guess.GUESS_GAMES.get(gameId);
  if (!game) return interaction.reply({ embeds: [err('Game expired.')], ephemeral: true });
  if (interaction.user.id !== game.user) return interaction.reply({ embeds: [err('Ye game aapka nahi hai.')], ephemeral: true });
  const modal = new ModalBuilder().setCustomId(`guess-modal:${gameId}`).setTitle('Guess the Number')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('num').setLabel('Number (1-100)').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(3),
    ));
  await interaction.showModal(modal);
}

async function handleHangOpen(interaction) {
  const [, gameId] = interaction.customId.split(':');
  const game = _hang.HANG_GAMES.get(gameId);
  if (!game) return interaction.reply({ embeds: [err('Game expired.')], ephemeral: true });
  if (interaction.user.id !== game.user) return interaction.reply({ embeds: [err('Ye game aapka nahi hai.')], ephemeral: true });
  const modal = new ModalBuilder().setCustomId(`hang-modal:${gameId}`).setTitle('Hangman — Guess a letter')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('letter').setLabel('A single letter').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(1),
    ));
  await interaction.showModal(modal);
}

async function handleTrivia(interaction) {
  const [, , , chosen, correct] = interaction.customId.split(':');
  const ok2 = chosen === correct;
  const e = baseEmbed({ title: ok2 ? '🎉  Correct!' : '❌  Wrong!', description: ok2 ? 'Sahi jawab! +5 XP soon™' : `Sahi answer option **${String.fromCharCode(65 + Number(correct))}** tha.`, color: ok2 ? COLOR.success : COLOR.danger });
  await interaction.update({ embeds: [e], components: [] });
}

async function handleTicketOpen(interaction) {
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
}

async function handleTicketClose(interaction) {
  const t = db().tickets[interaction.channel.id];
  if (!t) return interaction.reply({ embeds: [err('Ye ticket channel nahi hai.')], ephemeral: true });
  await interaction.reply({ embeds: [ok('Ticket 5 seconds me close hoga…')] });
  setTimeout(async () => {
    try {
      delete db().tickets[interaction.channel.id]; markDirty();
      await interaction.channel.delete('Ticket closed');
    } catch {}
  }, 5000);
}
