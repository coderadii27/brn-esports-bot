import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import crypto from 'node:crypto';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';

const PARSE_DURATION = (s) => {
  const m = String(s).trim().match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? 'm').toLowerCase();
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
};

export default [
  {
    data: new SlashCommandBuilder().setName('poll').setDescription('Quick yes/no poll banayein')
      .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
    async execute(interaction) {
      const q = interaction.options.getString('question');
      const e = baseEmbed({ title: `${EMOJI.info}  ${q}`, description: 'React with ✅ / ❌ to vote.', color: COLOR.primary, author: { name: `Poll by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() } });
      const msg = await interaction.reply({ embeds: [e], fetchReply: true });
      await msg.react('✅');
      await msg.react('❌');
    },
  },
  {
    data: new SlashCommandBuilder().setName('multipoll').setDescription('Multiple choice poll (max 5)')
      .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
      .addStringOption(o => o.setName('options').setDescription('Comma separated options').setRequired(true)),
    async execute(interaction) {
      const q = interaction.options.getString('question');
      const opts = interaction.options.getString('options').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      if (opts.length < 2) return interaction.reply({ embeds: [err('Kam se kam 2 options chahiye.')], ephemeral: true });
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
      const e = baseEmbed({ title: `${EMOJI.info}  ${q}`, description: opts.map((o, i) => `${emojis[i]}  ${o}`).join('\n'), color: COLOR.accent });
      const msg = await interaction.reply({ embeds: [e], fetchReply: true });
      for (let i = 0; i < opts.length; i++) await msg.react(emojis[i]);
    },
  },
  {
    data: new SlashCommandBuilder().setName('remindme').setDescription('Aapko reminder bhejega')
      .addStringOption(o => o.setName('when').setDescription('Time e.g. 10m, 2h, 1d').setRequired(true))
      .addStringOption(o => o.setName('text').setDescription('What to remind').setRequired(true)),
    async execute(interaction) {
      const ms = PARSE_DURATION(interaction.options.getString('when'));
      if (!ms) return interaction.reply({ embeds: [err('Time format galat hai. Example: `10m`, `2h`, `1d`.')], ephemeral: true });
      const text = interaction.options.getString('text');
      const at = Date.now() + ms;
      db().reminders.push({ userId: interaction.user.id, channelId: interaction.channelId, text, at });
      markDirty();
      await interaction.reply({ embeds: [ok(`Reminder set for <t:${Math.floor(at / 1000)}:R>\n> ${text}`, 'Reminder')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('timer').setDescription('Countdown timer chalayein')
      .addIntegerOption(o => o.setName('seconds').setDescription('Seconds').setRequired(true).setMinValue(1).setMaxValue(600)),
    async execute(interaction) {
      const s = interaction.options.getInteger('seconds');
      await interaction.reply({ embeds: [info(`Timer started for \`${s}s\`.`, 'Timer')] });
      setTimeout(() => interaction.followUp({ content: `<@${interaction.user.id}> ${EMOJI.clock} **Timer up!** (${s}s)` }).catch(() => {}), s * 1000);
    },
  },
  {
    data: new SlashCommandBuilder().setName('calc').setDescription('Math expression solve karein')
      .addStringOption(o => o.setName('expr').setDescription('Expression e.g. (2+3)*4').setRequired(true)),
    async execute(interaction) {
      const expr = interaction.options.getString('expr');
      if (!/^[\d+\-*/().\s%]+$/.test(expr)) return interaction.reply({ embeds: [err('Sirf numbers aur `+ - * / ( ) %` allowed hain.')], ephemeral: true });
      try {
        const result = Function(`"use strict"; return (${expr});`)();
        await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.tools}  Calc`, fields: [{ name: 'Expression', value: `\`${expr}\`` }, { name: 'Result', value: `**${result}**` }], color: COLOR.info })] });
      } catch { await interaction.reply({ embeds: [err('Invalid expression.')], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('base64encode').setDescription('Text ko base64 me encode karein')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      const t = interaction.options.getString('text');
      await interaction.reply({ embeds: [info(`\`${Buffer.from(t).toString('base64')}\``, 'Encoded')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('base64decode').setDescription('Base64 ko decode karein')
      .addStringOption(o => o.setName('text').setDescription('Base64').setRequired(true)),
    async execute(interaction) {
      try {
        const t = Buffer.from(interaction.options.getString('text'), 'base64').toString('utf8');
        await interaction.reply({ embeds: [info(`\`${t}\``, 'Decoded')] });
      } catch { await interaction.reply({ embeds: [err('Invalid base64.')], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('hash').setDescription('Text ka hash nikalein')
      .addStringOption(o => o.setName('algo').setDescription('Algorithm').setRequired(true).addChoices({ name: 'sha256', value: 'sha256' }, { name: 'sha1', value: 'sha1' }, { name: 'md5', value: 'md5' }))
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      const algo = interaction.options.getString('algo');
      const t = interaction.options.getString('text');
      const h = crypto.createHash(algo).update(t).digest('hex');
      await interaction.reply({ embeds: [info(`\`${h}\``, `${algo.toUpperCase()} hash`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('color').setDescription('Hex color preview')
      .addStringOption(o => o.setName('hex').setDescription('Hex like #5865f2').setRequired(true)),
    async execute(interaction) {
      let hex = interaction.options.getString('hex').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return interaction.reply({ embeds: [err('Hex 6 characters ka chahiye.')], ephemeral: true });
      const url = `https://singlecolorimage.com/get/${hex}/400x200`;
      await interaction.reply({ embeds: [baseEmbed({ title: `#${hex.toUpperCase()}`, color: parseInt(hex, 16), image: url })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('qrcode').setDescription('Text ka QR code generate karein')
      .addStringOption(o => o.setName('text').setDescription('Text or URL').setRequired(true)),
    async execute(interaction) {
      const t = encodeURIComponent(interaction.options.getString('text'));
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${t}`;
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.tools}  QR Code`, image: url, color: COLOR.dark })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('shorten').setDescription('URL chhota karein')
      .addStringOption(o => o.setName('url').setDescription('URL').setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      const url = interaction.options.getString('url');
      try {
        const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
        const short = (await r.text()).trim();
        if (!short.startsWith('http')) throw new Error(short);
        await interaction.editReply({ embeds: [ok(`[${short}](${short})`, 'Shortened')] });
      } catch (e) { await interaction.editReply({ embeds: [err(`Failed: ${e.message}`)] }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('choose').setDescription('Random choice from options')
      .addStringOption(o => o.setName('options').setDescription('Comma separated').setRequired(true)),
    async execute(interaction) {
      const opts = interaction.options.getString('options').split(',').map(s => s.trim()).filter(Boolean);
      if (opts.length < 2) return interaction.reply({ embeds: [err('Kam se kam 2 options dein.')], ephemeral: true });
      const pick = opts[Math.floor(Math.random() * opts.length)];
      await interaction.reply({ embeds: [info(`I choose: **${pick}**`, 'Chooser')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('reverse').setDescription('Text ko ulta karein')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.reply({ embeds: [info(`\`${[...interaction.options.getString('text')].reverse().join('')}\``, 'Reversed')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('uppercase').setDescription('Text ko UPPERCASE me convert karein')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.reply({ embeds: [info(`\`${interaction.options.getString('text').toUpperCase()}\``, 'Uppercase')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('lowercase').setDescription('Text ko lowercase me convert karein')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.reply({ embeds: [info(`\`${interaction.options.getString('text').toLowerCase()}\``, 'Lowercase')] });
    },
  },
];
