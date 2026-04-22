import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';

const TRIVIA = [
  { q: 'Capital of France?', a: ['Paris', 'London', 'Berlin', 'Rome'], correct: 0 },
  { q: 'Sabse bada planet?', a: ['Earth', 'Saturn', 'Jupiter', 'Mars'], correct: 2 },
  { q: 'JS me typeof null?', a: ['"null"', '"object"', '"undefined"', 'error'], correct: 1 },
  { q: 'India\'s national animal?', a: ['Lion', 'Tiger', 'Elephant', 'Peacock'], correct: 1 },
  { q: 'HTTP status for "Not Found"?', a: ['400', '401', '403', '404'], correct: 3 },
  { q: 'Square root of 144?', a: ['10', '12', '14', '16'], correct: 1 },
];

const RIDDLES = [
  { q: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?', a: 'echo' },
  { q: 'The more you take, the more you leave behind. What are they?', a: 'footsteps' },
  { q: 'What has keys but no locks?', a: 'keyboard' },
];

const WYR = [
  'Always be 10 minutes late OR always be 20 minutes early?',
  'Have unlimited coffee OR unlimited internet?',
  'Speak every language OR play every instrument?',
  'Live without music OR live without movies?',
];

const TRUTH = [
  'What was your most embarrassing moment?',
  'Sabse weird dream konsa tha?',
  'One secret jo abhi tak kisi ko nahi bataya?',
];
const DARE = [
  'Sing a song in voice chat for 30 seconds.',
  'Change your nickname to "Banana King" for 1 hour.',
  'Send a screenshot of your last 3 search queries.',
];

const HANGMAN_WORDS = ['discord', 'javascript', 'banana', 'replit', 'guitar', 'mountain', 'octopus', 'algorithm'];
const TTT_GAMES = new Map();
const HANG_GAMES = new Map();
const GUESS_GAMES = new Map();

function ttRender(board) {
  return board.map((c, i) => c === 0 ? '⬛' : c === 1 ? '❌' : '⭕').reduce((rows, cell, i) => { rows[Math.floor(i / 3)] += cell; return rows; }, ['', '', '']).join('\n');
}
function ttWinner(b) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b1,c] of L) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  if (b.every(x => x)) return -1;
  return 0;
}
function ttRow(board, gameId) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      row.addComponents(new ButtonBuilder().setCustomId(`ttt:${gameId}:${i}`).setLabel(board[i] === 0 ? '·' : board[i] === 1 ? 'X' : 'O').setStyle(board[i] === 0 ? ButtonStyle.Secondary : board[i] === 1 ? ButtonStyle.Danger : ButtonStyle.Success).setDisabled(board[i] !== 0));
    }
    rows.push(row);
  }
  return rows;
}

export const _ttt = { TTT_GAMES, ttRender, ttWinner, ttRow };
export const _hang = { HANG_GAMES };
export const _guess = { GUESS_GAMES };

export default [
  {
    data: new SlashCommandBuilder().setName('tictactoe').setDescription('Tic Tac Toe (you vs bot)'),
    async execute(interaction) {
      const id = `${interaction.user.id}:${Date.now()}`;
      const board = Array(9).fill(0);
      TTT_GAMES.set(id, { board, turn: 1, user: interaction.user.id });
      await interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.game}  Tic Tac Toe`, description: `Aap **❌** hain. Apni cell click karein.\n\n${ttRender(board)}`, color: COLOR.primary })], components: ttRow(board, id) });
    },
  },
  {
    data: new SlashCommandBuilder().setName('guessnumber').setDescription('1-100 ke beech number guess karein'),
    async execute(interaction) {
      const target = 1 + Math.floor(Math.random() * 100);
      const id = `${interaction.user.id}:${Date.now()}`;
      GUESS_GAMES.set(id, { target, attempts: 0, user: interaction.user.id });
      await interaction.reply({
        embeds: [baseEmbed({ title: `${EMOJI.game}  Guess the Number`, description: 'Maine 1 se 100 ke beech ek number socha hai. Try karein!', color: COLOR.info })],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`guess:${id}`).setLabel('Make a guess').setStyle(ButtonStyle.Primary).setEmoji('🎯'))],
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName('trivia').setDescription('Trivia question'),
    async execute(interaction) {
      const t = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
      const id = `tr:${interaction.user.id}:${Date.now()}`;
      const row = new ActionRowBuilder().addComponents(t.a.map((opt, i) => new ButtonBuilder().setCustomId(`trivia:${id}:${i}:${t.correct}`).setLabel(`${String.fromCharCode(65 + i)}. ${opt}`.slice(0, 80)).setStyle(ButtonStyle.Primary)));
      await interaction.reply({ embeds: [baseEmbed({ title: '🧠  Trivia', description: `**${t.q}**`, color: COLOR.info })], components: [row] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('hangman').setDescription('Hangman game'),
    async execute(interaction) {
      const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
      const id = `${interaction.user.id}:${Date.now()}`;
      HANG_GAMES.set(id, { word, guessed: new Set(), wrong: 0, user: interaction.user.id });
      const masked = word.split('').map(() => '_').join(' ');
      await interaction.reply({
        embeds: [baseEmbed({ title: '🪢  Hangman', description: `\`${masked}\`\nLetters left: 6 wrong guesses allowed`, color: COLOR.warning })],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`hang:${id}`).setLabel('Guess a letter').setStyle(ButtonStyle.Primary))],
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName('wyr').setDescription('Would you rather?'),
    async execute(interaction) {
      await interaction.reply({ embeds: [baseEmbed({ title: '🤔  Would you rather…', description: WYR[Math.floor(Math.random() * WYR.length)], color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('truthordare').setDescription('Truth ya Dare?')
      .addStringOption(o => o.setName('mode').setDescription('truth/dare/random').addChoices({ name: 'truth', value: 't' }, { name: 'dare', value: 'd' }, { name: 'random', value: 'r' })),
    async execute(interaction) {
      const mode = interaction.options.getString('mode') ?? 'r';
      const truth = mode === 't' || (mode === 'r' && Math.random() < 0.5);
      const list = truth ? TRUTH : DARE;
      const t = list[Math.floor(Math.random() * list.length)];
      await interaction.reply({ embeds: [baseEmbed({ title: truth ? '🤫  Truth' : '😈  Dare', description: t, color: truth ? COLOR.info : COLOR.danger })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('riddle').setDescription('Random riddle'),
    async execute(interaction) {
      const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      await interaction.reply({ embeds: [baseEmbed({ title: '🧩  Riddle', description: `**${r.q}**\n\n||Answer: ${r.a}||`, color: COLOR.accent })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('coin-game').setDescription('Bet a coinflip')
      .addStringOption(o => o.setName('side').setDescription('heads/tails').setRequired(true).addChoices({ name: 'heads', value: 'h' }, { name: 'tails', value: 't' })),
    async execute(interaction) {
      const side = interaction.options.getString('side');
      const r = Math.random() < 0.5 ? 'h' : 't';
      const win = side === r;
      await interaction.reply({ embeds: [baseEmbed({ title: win ? '🎉  You won!' : '💀  You lost!', description: `Coin landed on **${r === 'h' ? 'Heads' : 'Tails'}**.`, color: win ? COLOR.success : COLOR.danger })] });
    },
  },
];
