import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI, progressBar } from '../embed.js';
import { db, getLevel, markDirty } from '../db.js';
import { paginate, sendPaginated } from '../pagination.js';

const xpForLevel = (lvl) => 100 * (lvl + 1) ** 2;

export default [
  {
    data: new SlashCommandBuilder().setName('rank').setDescription('Aapka level dekho')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const u = interaction.options.getUser('user') ?? interaction.user;
      const l = getLevel(u.id);
      const need = xpForLevel(l.level);
      const bar = progressBar(l.xp, need, 18);
      await interaction.reply({ embeds: [baseEmbed({
        title: `${EMOJI.trophy}  ${u.username}'s Rank`,
        thumbnail: u.displayAvatarURL(),
        color: COLOR.gold,
        fields: [
          { name: 'Level', value: `**${l.level}**`, inline: true },
          { name: 'XP', value: `\`${l.xp}\` / \`${need}\``, inline: true },
          { name: 'Progress', value: `\`${bar}\` ${Math.floor((l.xp / need) * 100)}%` },
        ],
      })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('xp-leaderboard').setDescription('Top XP earners'),
    async execute(interaction) {
      const arr = Object.entries(db().levels).map(([id, l]) => ({ id, ...l, total: l.level * 1_000_000 + l.xp })).sort((a, b) => b.total - a.total).slice(0, 50);
      if (!arr.length) return interaction.reply({ embeds: [info('Abhi koi XP data nahi hai. Chat karo!')] });
      const pages = paginate(arr, 10);
      await sendPaginated(interaction, (items, idx, total) => baseEmbed({
        title: `${EMOJI.trophy}  XP Leaderboard`,
        color: COLOR.gold,
        description: items.map((u, i) => {
          const rank = idx * 10 + i + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**#${rank}**`;
          return `${medal} <@${u.id}> — Lv \`${u.level}\` (\`${u.xp}\` xp)`;
        }).join('\n'),
        footer: { text: `Page ${idx + 1} / ${total}` },
      }), pages, 'xplb');
    },
  },
  {
    data: new SlashCommandBuilder().setName('addxp').setDescription('Admin: user ko XP dein').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ embeds: [err('Admin only.')], ephemeral: true });
      const u = interaction.options.getUser('user');
      const n = interaction.options.getInteger('amount');
      const l = getLevel(u.id);
      l.xp += n;
      while (l.xp >= xpForLevel(l.level)) { l.xp -= xpForLevel(l.level); l.level++; }
      markDirty();
      await interaction.reply({ embeds: [ok(`<@${u.id}> ko **${n}** XP diya. Ab Lv ${l.level} (${l.xp} xp).`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('resetxp').setDescription('Admin: user ka XP reset').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ embeds: [err('Admin only.')], ephemeral: true });
      const u = interaction.options.getUser('user');
      db().levels[u.id] = { xp: 0, level: 0, lastMsg: 0 };
      markDirty();
      await interaction.reply({ embeds: [ok(`<@${u.id}> ka XP reset.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('setlevel').setDescription('Admin: user ka level set karein').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true).setMinValue(0).setMaxValue(500)),
    async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ embeds: [err('Admin only.')], ephemeral: true });
      const u = interaction.options.getUser('user');
      const lv = interaction.options.getInteger('level');
      const l = getLevel(u.id);
      l.level = lv; l.xp = 0; markDirty();
      await interaction.reply({ embeds: [ok(`<@${u.id}> ko Lv ${lv} pe set kiya.`)] });
    },
  },
];
