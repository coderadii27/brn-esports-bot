import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { getEconomy, db, markDirty } from '../db.js';
import { paginate, sendPaginated } from '../pagination.js';

const COOLDOWN = { daily: 86_400_000, weekly: 604_800_000, work: 3_600_000, beg: 5 * 60_000, rob: 30 * 60_000 };

const SHOP = [
  { id: 'fish_rod', name: 'Fishing Rod', price: 500, emoji: '🎣' },
  { id: 'laptop', name: 'Laptop', price: 5000, emoji: '💻' },
  { id: 'car', name: 'Sports Car', price: 50000, emoji: '🏎️' },
  { id: 'house', name: 'House', price: 250000, emoji: '🏡' },
  { id: 'crown', name: 'Royal Crown', price: 1_000_000, emoji: '👑' },
  { id: 'pizza', name: 'Pizza', price: 50, emoji: '🍕' },
  { id: 'rose', name: 'Rose', price: 100, emoji: '🌹' },
  { id: 'diamond', name: 'Diamond', price: 100000, emoji: '💎' },
];
const WORK_LINES = [
  ['🍕 Delivered pizzas', 50, 200],
  ['💻 Wrote some code', 100, 400],
  ['🎨 Designed a logo', 80, 300],
  ['🚕 Drove a cab', 60, 250],
  ['📦 Stocked shelves', 40, 150],
  ['🎤 Performed at open mic', 120, 500],
];
const BEG_LINES = [
  ['Some kind soul gave you', 5, 50],
  ['You found dropped coins:', 1, 30],
  ['A grandma handed you', 10, 80],
];
const fmtCoin = (n) => `${EMOJI.coin} **${n.toLocaleString()}**`;
const fmtMs = (ms) => {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const data = new SlashCommandBuilder().setName('eco').setDescription('Economy commands')
  .addSubcommand(s => s.setName('balance').setDescription('Wallet aur bank balance').addUserOption(o => o.setName('user').setDescription('User')))
  .addSubcommand(s => s.setName('daily').setDescription('Daily reward claim karein'))
  .addSubcommand(s => s.setName('weekly').setDescription('Weekly reward claim karein'))
  .addSubcommand(s => s.setName('work').setDescription('Kaam karke paise kamayein'))
  .addSubcommand(s => s.setName('beg').setDescription('Bheekh maango'))
  .addSubcommand(s => s.setName('rob').setDescription('Kisi ko loot ne ki koshish').addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)))
  .addSubcommand(s => s.setName('deposit').setDescription('Bank me daalen').addIntegerOption(o => o.setName('amount').setDescription('Amount (0 = all)').setRequired(true).setMinValue(0)))
  .addSubcommand(s => s.setName('withdraw').setDescription('Bank se nikaalen').addIntegerOption(o => o.setName('amount').setDescription('Amount (0 = all)').setRequired(true).setMinValue(0)))
  .addSubcommand(s => s.setName('pay').setDescription('Kisi ko paise dein').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('leaderboard').setDescription('Richest users'))
  .addSubcommand(s => s.setName('shop').setDescription('Items dikhayein'))
  .addSubcommand(s => s.setName('buy').setDescription('Item khareedein').addStringOption(o => o.setName('item').setDescription('Item').setRequired(true).addChoices(...SHOP.map(it => ({ name: it.name, value: it.id })))))
  .addSubcommand(s => s.setName('inventory').setDescription('Aapke items').addUserOption(o => o.setName('user').setDescription('User')));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const u = interaction.user;
  if (sub === 'balance') {
    const target = interaction.options.getUser('user') ?? u;
    const e = getEconomy(target.id);
    return interaction.reply({ embeds: [baseEmbed({
      title: `${EMOJI.bank}  ${target.username}'s Treasury`,
      thumbnail: target.displayAvatarURL(),
      color: COLOR.gold,
      fields: [
        { name: 'Wallet', value: fmtCoin(e.wallet), inline: true },
        { name: 'Bank', value: fmtCoin(e.bank), inline: true },
        { name: 'Net Worth', value: fmtCoin(e.wallet + e.bank), inline: true },
      ],
    })] });
  }
  if (sub === 'daily') {
    const e = getEconomy(u.id);
    const left = e.lastDaily + COOLDOWN.daily - Date.now();
    if (left > 0) return interaction.reply({ embeds: [info(`Daily already claimed. Try in **${fmtMs(left)}**.`, 'Cooldown')], ephemeral: true });
    e.wallet += 500; e.lastDaily = Date.now(); markDirty();
    return interaction.reply({ embeds: [ok(`+${fmtCoin(500)}\nNew wallet: ${fmtCoin(e.wallet)}`, 'Daily Reward')] });
  }
  if (sub === 'weekly') {
    const e = getEconomy(u.id);
    const left = e.lastWeekly + COOLDOWN.weekly - Date.now();
    if (left > 0) return interaction.reply({ embeds: [info(`Weekly already claimed. Try in **${fmtMs(left)}**.`, 'Cooldown')], ephemeral: true });
    e.wallet += 5000; e.lastWeekly = Date.now(); markDirty();
    return interaction.reply({ embeds: [ok(`+${fmtCoin(5000)}\nNew wallet: ${fmtCoin(e.wallet)}`, 'Weekly Reward')] });
  }
  if (sub === 'work') {
    const e = getEconomy(u.id);
    const left = e.lastWork + COOLDOWN.work - Date.now();
    if (left > 0) return interaction.reply({ embeds: [info(`Aap thake hue ho. Try in **${fmtMs(left)}**.`, 'Cooldown')], ephemeral: true });
    const [line, lo, hi] = WORK_LINES[Math.floor(Math.random() * WORK_LINES.length)];
    const earn = lo + Math.floor(Math.random() * (hi - lo + 1));
    e.wallet += earn; e.lastWork = Date.now(); markDirty();
    return interaction.reply({ embeds: [ok(`${line} aur **${earn.toLocaleString()}** ${EMOJI.coin} kamaye.\nNew wallet: ${fmtCoin(e.wallet)}`, 'Work')] });
  }
  if (sub === 'beg') {
    const e = getEconomy(u.id);
    const left = e.lastBeg + COOLDOWN.beg - Date.now();
    if (left > 0) return interaction.reply({ embeds: [info(`Sharm karo. Try in **${fmtMs(left)}**.`, 'Cooldown')], ephemeral: true });
    e.lastBeg = Date.now();
    if (Math.random() < 0.2) { markDirty(); return interaction.reply({ embeds: [err('Kisi ne kuch nahi diya. 😢', 'Beg failed')] }); }
    const [line, lo, hi] = BEG_LINES[Math.floor(Math.random() * BEG_LINES.length)];
    const earn = lo + Math.floor(Math.random() * (hi - lo + 1));
    e.wallet += earn; markDirty();
    return interaction.reply({ embeds: [ok(`${line} **${earn}** ${EMOJI.coin}.`, 'Beg')] });
  }
  if (sub === 'rob') {
    const target = interaction.options.getUser('user');
    if (target.id === u.id) return interaction.reply({ embeds: [err('Apne aap ko nahi loot sakte.')], ephemeral: true });
    if (target.bot) return interaction.reply({ embeds: [err('Bot ko nahi loot sakte.')], ephemeral: true });
    const me = getEconomy(u.id);
    const left = me.lastRob + COOLDOWN.rob - Date.now();
    if (left > 0) return interaction.reply({ embeds: [info(`Police ka heat hai. Try in **${fmtMs(left)}**.`, 'Cooldown')], ephemeral: true });
    const t = getEconomy(target.id);
    me.lastRob = Date.now();
    if (t.wallet < 50) { markDirty(); return interaction.reply({ embeds: [err(`<@${target.id}> ke paas loot ne layak nahi hai.`)] }); }
    if (Math.random() < 0.4) {
      const fine = Math.min(me.wallet, 100 + Math.floor(Math.random() * 200));
      me.wallet -= fine; markDirty();
      return interaction.reply({ embeds: [err(`Pakde gaye! **${fine}** ${EMOJI.coin} fine bharna pada.`, 'Caught!')] });
    }
    const stolen = Math.floor(t.wallet * (0.1 + Math.random() * 0.3));
    t.wallet -= stolen; me.wallet += stolen; markDirty();
    return interaction.reply({ embeds: [ok(`<@${target.id}> se **${stolen}** ${EMOJI.coin} loot liye.`, 'Heist successful')] });
  }
  if (sub === 'deposit') {
    const e = getEconomy(u.id);
    let n = interaction.options.getInteger('amount');
    if (n === 0) n = e.wallet;
    if (n > e.wallet) return interaction.reply({ embeds: [err(`Wallet me sirf ${fmtCoin(e.wallet)} hai.`)], ephemeral: true });
    e.wallet -= n; e.bank += n; markDirty();
    return interaction.reply({ embeds: [ok(`Bank me ${fmtCoin(n)} deposit kiye.\nWallet: ${fmtCoin(e.wallet)} • Bank: ${fmtCoin(e.bank)}`)] });
  }
  if (sub === 'withdraw') {
    const e = getEconomy(u.id);
    let n = interaction.options.getInteger('amount');
    if (n === 0) n = e.bank;
    if (n > e.bank) return interaction.reply({ embeds: [err(`Bank me sirf ${fmtCoin(e.bank)} hai.`)], ephemeral: true });
    e.bank -= n; e.wallet += n; markDirty();
    return interaction.reply({ embeds: [ok(`Wallet me ${fmtCoin(n)} nikaal liye.`)] });
  }
  if (sub === 'pay') {
    const target = interaction.options.getUser('user');
    if (target.id === u.id || target.bot) return interaction.reply({ embeds: [err('Invalid target.')], ephemeral: true });
    const n = interaction.options.getInteger('amount');
    const me = getEconomy(u.id);
    if (me.wallet < n) return interaction.reply({ embeds: [err(`Wallet me sirf ${fmtCoin(me.wallet)} hai.`)], ephemeral: true });
    const t = getEconomy(target.id);
    me.wallet -= n; t.wallet += n; markDirty();
    return interaction.reply({ embeds: [ok(`<@${target.id}> ko ${fmtCoin(n)} bhej diye.`, 'Payment sent')] });
  }
  if (sub === 'leaderboard') {
    const all = db().economy;
    const arr = Object.entries(all).map(([id, e]) => ({ id, total: e.wallet + e.bank })).sort((a, b) => b.total - a.total).slice(0, 50);
    if (!arr.length) return interaction.reply({ embeds: [info('Koi data nahi hai abhi.')] });
    const pages = paginate(arr, 10);
    return sendPaginated(interaction, (items, idx, total) => baseEmbed({
      title: `${EMOJI.trophy}  Leaderboard`,
      color: COLOR.gold,
      description: items.map((u2, i) => {
        const rank = idx * 10 + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**#${rank}**`;
        return `${medal} <@${u2.id}> — ${fmtCoin(u2.total)}`;
      }).join('\n'),
      footer: { text: `Page ${idx + 1} / ${total}` },
    }), pages, 'lb');
  }
  if (sub === 'shop') {
    const desc = SHOP.map(s => `${s.emoji}  **${s.name}** — ${fmtCoin(s.price)}\n\`/eco buy item:${s.id}\``).join('\n\n');
    return interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.bank}  Shop`, description: desc, color: COLOR.gold })] });
  }
  if (sub === 'buy') {
    const id = interaction.options.getString('item');
    const item = SHOP.find(s => s.id === id);
    if (!item) return interaction.reply({ embeds: [err('Item nahi mila.')], ephemeral: true });
    const e = getEconomy(u.id);
    if (e.wallet < item.price) return interaction.reply({ embeds: [err(`Wallet me sirf ${fmtCoin(e.wallet)} hai. Chahiye ${fmtCoin(item.price)}.`)], ephemeral: true });
    e.wallet -= item.price; e.inventory.push(id); markDirty();
    return interaction.reply({ embeds: [ok(`${item.emoji} **${item.name}** khareed liya!`, 'Purchase complete')] });
  }
  if (sub === 'inventory') {
    const target = interaction.options.getUser('user') ?? u;
    const e = getEconomy(target.id);
    if (!e.inventory.length) return interaction.reply({ embeds: [info('Inventory khaali hai. `/eco shop` se khareedein.', 'Inventory')] });
    const counts = {};
    for (const id of e.inventory) counts[id] = (counts[id] ?? 0) + 1;
    const lines = Object.entries(counts).map(([id, c]) => {
      const item = SHOP.find(s => s.id === id);
      return item ? `${item.emoji}  **${item.name}** × ${c}` : `\`${id}\` × ${c}`;
    });
    return interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.bank}  ${target.username}'s Inventory`, description: lines.join('\n'), color: COLOR.gold })] });
  }
}

export default [{ data, execute }];
