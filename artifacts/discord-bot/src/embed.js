import { EmbedBuilder } from 'discord.js';

export const COLOR = {
  primary: 0x6366f1,
  success: 0x22c55e,
  warning: 0xf59e0b,
  danger: 0xef4444,
  info: 0x38bdf8,
  accent: 0xec4899,
  gold: 0xfacc15,
  dark: 0x1f2937,
};

export const EMOJI = {
  ok: '✅', err: '⛔', warn: '⚠️', info: 'ℹ️', spark: '✨', star: '⭐',
  fire: '🔥', heart: '❤️', coin: '🪙', bank: '🏦', trophy: '🏆',
  ping: '📡', mod: '🛡️', tools: '🛠️', game: '🎮', dice: '🎲',
  ai: '🤖', music: '🎵', clock: '⏰', book: '📖', pin: '📌',
  arrowL: '◀️', arrowR: '▶️', first: '⏮️', last: '⏭️', stop: '⏹️',
};

const FOOTER = 'CYCLOPS • crafted with care';

export function baseEmbed(opts = {}) {
  const e = new EmbedBuilder().setColor(opts.color ?? COLOR.primary).setTimestamp();
  if (opts.title) e.setTitle(opts.title);
  if (opts.description) e.setDescription(opts.description);
  if (opts.fields?.length) e.addFields(opts.fields);
  e.setFooter(opts.footer ? opts.footer : { text: FOOTER });
  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.image) e.setImage(opts.image);
  if (opts.author) e.setAuthor(opts.author);
  if (opts.url) e.setURL(opts.url);
  return e;
}

export const ok = (description, title = 'Success') =>
  baseEmbed({ title: `${EMOJI.ok}  ${title}`, description, color: COLOR.success });
export const err = (description, title = 'Something went wrong') =>
  baseEmbed({ title: `${EMOJI.err}  ${title}`, description, color: COLOR.danger });
export const warn = (description, title = 'Heads up') =>
  baseEmbed({ title: `${EMOJI.warn}  ${title}`, description, color: COLOR.warning });
export const info = (description, title = 'Info') =>
  baseEmbed({ title: `${EMOJI.info}  ${title}`, description, color: COLOR.info });

export function progressBar(value, max, length = 14) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}
