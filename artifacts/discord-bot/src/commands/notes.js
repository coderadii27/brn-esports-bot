import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { getNotes, getTodos, markDirty } from '../db.js';
import { paginate, sendPaginated } from '../pagination.js';

export default [
  {
    data: new SlashCommandBuilder().setName('note-add').setDescription('Personal note add karein')
      .addStringOption(o => o.setName('text').setDescription('Note').setRequired(true)),
    async execute(interaction) {
      const list = getNotes(interaction.user.id);
      list.push({ text: interaction.options.getString('text'), at: Date.now() });
      markDirty();
      await interaction.reply({ embeds: [ok(`Note #${list.length} saved.`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('note-list').setDescription('Apne saare notes dekho'),
    async execute(interaction) {
      const list = getNotes(interaction.user.id);
      if (!list.length) return interaction.reply({ embeds: [info('Aapke koi notes nahi hain.')], ephemeral: true });
      const pages = paginate(list, 5);
      await sendPaginated(interaction, (items, idx, total) => baseEmbed({
        title: `${EMOJI.book}  Your Notes`,
        color: COLOR.info,
        description: items.map((n, i) => `**#${idx * 5 + i + 1}** • <t:${Math.floor(n.at / 1000)}:R>\n> ${n.text}`).join('\n\n'),
        footer: { text: `Page ${idx + 1} / ${total}` },
      }), pages, 'notes');
    },
  },
  {
    data: new SlashCommandBuilder().setName('note-remove').setDescription('Note number ko delete karein')
      .addIntegerOption(o => o.setName('number').setDescription('Note #').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const list = getNotes(interaction.user.id);
      const n = interaction.options.getInteger('number');
      if (n > list.length) return interaction.reply({ embeds: [err('Itna number nahi hai.')], ephemeral: true });
      list.splice(n - 1, 1); markDirty();
      await interaction.reply({ embeds: [ok(`Note #${n} deleted.`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('note-clear').setDescription('Saare notes delete karein'),
    async execute(interaction) {
      const list = getNotes(interaction.user.id);
      list.length = 0; markDirty();
      await interaction.reply({ embeds: [ok('Saare notes clear ho gaye.')], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('todo-add').setDescription('Todo item add karein')
      .addStringOption(o => o.setName('text').setDescription('Task').setRequired(true)),
    async execute(interaction) {
      const list = getTodos(interaction.user.id);
      list.push({ text: interaction.options.getString('text'), done: false, at: Date.now() });
      markDirty();
      await interaction.reply({ embeds: [ok(`Todo #${list.length} added.`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('todo-list').setDescription('Apne todos dekho'),
    async execute(interaction) {
      const list = getTodos(interaction.user.id);
      if (!list.length) return interaction.reply({ embeds: [info('Koi todo nahi.')], ephemeral: true });
      const pages = paginate(list, 8);
      await sendPaginated(interaction, (items, idx, total) => baseEmbed({
        title: `${EMOJI.pin}  Your Todos`,
        color: COLOR.primary,
        description: items.map((t, i) => `${t.done ? '✅' : '⬜'} **#${idx * 8 + i + 1}** ${t.text}`).join('\n'),
        footer: { text: `Page ${idx + 1} / ${total}` },
      }), pages, 'todos');
    },
  },
  {
    data: new SlashCommandBuilder().setName('todo-done').setDescription('Todo done mark karein')
      .addIntegerOption(o => o.setName('number').setDescription('Todo #').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const list = getTodos(interaction.user.id);
      const n = interaction.options.getInteger('number');
      if (n > list.length) return interaction.reply({ embeds: [err('Itna number nahi hai.')], ephemeral: true });
      list[n - 1].done = true; markDirty();
      await interaction.reply({ embeds: [ok(`Todo #${n} ✅ complete!`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('todo-remove').setDescription('Todo delete karein')
      .addIntegerOption(o => o.setName('number').setDescription('Todo #').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const list = getTodos(interaction.user.id);
      const n = interaction.options.getInteger('number');
      if (n > list.length) return interaction.reply({ embeds: [err('Itna number nahi hai.')], ephemeral: true });
      list.splice(n - 1, 1); markDirty();
      await interaction.reply({ embeds: [ok(`Todo #${n} deleted.`)], ephemeral: true });
    },
  },
];
