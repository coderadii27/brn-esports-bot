import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, info, COLOR, EMOJI } from '../embed.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const EIGHT = ['Bilkul yes!', 'Definitely.', 'Without a doubt.', 'Most likely.', 'Outlook good.', 'Yes — duh.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Cannot predict now.', 'Concentrate and ask again.', "Don't count on it.", 'My reply is no.', 'Outlook not so good.', 'Very doubtful.'];
const JOKES = [
  'Programmer ki wife: chai aur biscuit le aao. Programmer kabhi nahi laata, biscuit return karta hai.',
  'Why do Java developers wear glasses? Because they don\'t C#.',
  'Pen drive: "Mujhe insert karo." Laptop: "Pehle main check karunga ki tum FAT toh nahi.”',
  'There are 10 types of people in this world: those who understand binary and those who don\'t.',
  '404: Joke not found.',
  'Wifi password kya hai? "TumheKyaKaroge1234"',
];
const FACTS = [
  'Octopus ke 3 hearts hote hain.',
  'Bananas radioactive hote hain (very mildly).',
  'Honey kabhi expire nahi hota — Egyptian tombs me 3000 saal purana shahad mila hai.',
  'Sharks dinosaurs se purane hain.',
  'Hot water cold water se zyada jaldi freeze ho sakta hai (Mpemba effect).',
];
const QUOTES = [
  '“Stay hungry, stay foolish.” — Steve Jobs',
  '“The only way to do great work is to love what you do.” — Steve Jobs',
  '“Talk is cheap. Show me the code.” — Linus Torvalds',
  '“In the middle of every difficulty lies opportunity.” — Einstein',
  '“Code is like humor. When you have to explain it, it’s bad.” — Cory House',
];
const PICKUP = [
  'Are you JavaScript? Because every time I look at you, my heart goes `undefined`.',
  'Are you a CSS file? Because you bring style to my life.',
  'Tum HTML ho? Kyunki bina tumhare meri zindagi structureless hai.',
];
const ROAST = [
  'Tumhari personality bhi WiFi ki tarah hai — strong jab door ho.',
  'Tumhare ideas ka SLA hai: "eventually consistent".',
  'Tum bot ban jao toh user koi nahi milega.',
];
const COMPLIMENT = [
  'Aap genuine ek ray of sunshine ho. ☀️',
  'Aapki vibe har room ko upgrade kar deti hai.',
  'Aap aise insaan ho jinke saath time fast nikal jaata hai.',
];

export default [
  {
    data: new SlashCommandBuilder().setName('8ball').setDescription('Magic 8-ball se sawal puchein')
      .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
    async execute(interaction) {
      const q = interaction.options.getString('question');
      await interaction.reply({ embeds: [baseEmbed({ title: '🎱  Magic 8-Ball', color: COLOR.dark, fields: [{ name: 'Q', value: q }, { name: 'A', value: `**${pick(EIGHT)}**` }] })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('dice').setDescription('Dice roll karein')
      .addIntegerOption(o => o.setName('sides').setDescription('Sides (default 6)').setMinValue(2).setMaxValue(1000))
      .addIntegerOption(o => o.setName('count').setDescription('Kitne dice').setMinValue(1).setMaxValue(20)),
    async execute(interaction) {
      const s = interaction.options.getInteger('sides') ?? 6;
      const c = interaction.options.getInteger('count') ?? 1;
      const rolls = Array.from({ length: c }, () => 1 + Math.floor(Math.random() * s));
      const total = rolls.reduce((a, b) => a + b, 0);
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.dice}  Rolled ${c}d${s}`, description: `Rolls: \`${rolls.join(', ')}\`\nTotal: **${total}**`, color: COLOR.gold })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('coinflip').setDescription('Sikka uchhalein'),
    async execute(interaction) {
      const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await interaction.reply({ embeds: [baseEmbed({ title: `🪙  ${r}!`, color: COLOR.gold })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('rps').setDescription('Rock paper scissors')
      .addStringOption(o => o.setName('move').setDescription('Choose').setRequired(true).addChoices({ name: 'rock', value: 'rock' }, { name: 'paper', value: 'paper' }, { name: 'scissors', value: 'scissors' })),
    async execute(interaction) {
      const u = interaction.options.getString('move');
      const b = pick(['rock', 'paper', 'scissors']);
      const win = (u === 'rock' && b === 'scissors') || (u === 'paper' && b === 'rock') || (u === 'scissors' && b === 'paper');
      const result = u === b ? 'Tie!' : win ? 'You win!' : 'I win!';
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.game}  RPS`, color: u === b ? COLOR.warning : win ? COLOR.success : COLOR.danger, fields: [{ name: 'You', value: u, inline: true }, { name: 'Bot', value: b, inline: true }, { name: 'Result', value: result, inline: true }] })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('joke').setDescription('Random joke'),
    async execute(interaction) { await interaction.reply({ embeds: [baseEmbed({ title: '😂  Joke', description: pick(JOKES), color: COLOR.accent })] }); },
  },
  {
    data: new SlashCommandBuilder().setName('fact').setDescription('Random fact'),
    async execute(interaction) { await interaction.reply({ embeds: [baseEmbed({ title: '🧠  Fact', description: pick(FACTS), color: COLOR.info })] }); },
  },
  {
    data: new SlashCommandBuilder().setName('quote').setDescription('Inspirational quote'),
    async execute(interaction) { await interaction.reply({ embeds: [baseEmbed({ title: '💭  Quote', description: pick(QUOTES), color: COLOR.primary })] }); },
  },
  {
    data: new SlashCommandBuilder().setName('pickup').setDescription('Pick-up line'),
    async execute(interaction) { await interaction.reply({ embeds: [baseEmbed({ title: '💘  Smooth.', description: pick(PICKUP), color: COLOR.accent })] }); },
  },
  {
    data: new SlashCommandBuilder().setName('roast').setDescription('Light-hearted roast')
      .addUserOption(o => o.setName('user').setDescription('Target')),
    async execute(interaction) {
      const u = interaction.options.getUser('user') ?? interaction.user;
      await interaction.reply({ embeds: [baseEmbed({ title: `🔥  Roast for ${u.username}`, description: pick(ROAST), color: COLOR.danger })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('compliment').setDescription('Sweet compliment')
      .addUserOption(o => o.setName('user').setDescription('Target')),
    async execute(interaction) {
      const u = interaction.options.getUser('user') ?? interaction.user;
      await interaction.reply({ embeds: [baseEmbed({ title: `💖  For ${u.username}`, description: pick(COMPLIMENT), color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('ascii').setDescription('Text ko ASCII banner banayein')
      .addStringOption(o => o.setName('text').setDescription('Text (max 15 chars)').setRequired(true).setMaxLength(15)),
    async execute(interaction) {
      const t = interaction.options.getString('text');
      const banner = t.toUpperCase().split('').map(c => `▌${c}▐`).join(' ');
      await interaction.reply({ embeds: [info(`\`\`\`\n${banner}\n\`\`\``, 'ASCII')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('mock').setDescription('SpOnGeBoB tExT')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      const out = [...interaction.options.getString('text')].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('');
      await interaction.reply({ embeds: [info(out, 'Mock')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('clap').setDescription('Add 👏 between👏words')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.reply({ embeds: [info(interaction.options.getString('text').split(/\s+/).join(' 👏 '), 'Clap')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('lovecalc').setDescription('Love compatibility 💕')
      .addUserOption(o => o.setName('user1').setDescription('User 1').setRequired(true))
      .addUserOption(o => o.setName('user2').setDescription('User 2').setRequired(true)),
    async execute(interaction) {
      const a = interaction.options.getUser('user1');
      const b = interaction.options.getUser('user2');
      const ids = [a.id, b.id].sort().join(':');
      let h = 0; for (const c of ids) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const score = h % 101;
      const heart = score > 80 ? '💞' : score > 60 ? '💖' : score > 40 ? '❤️' : score > 20 ? '🤍' : '💔';
      await interaction.reply({ embeds: [baseEmbed({ title: `${heart}  Love Calculator`, description: `**${a.username}** + **${b.username}**\n\nCompatibility: **${score}%**`, color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('say').setDescription('Bot se kuch kehlao')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.reply({ embeds: [baseEmbed({ description: interaction.options.getString('text'), color: COLOR.primary, author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() } })] });
    },
  },
];
