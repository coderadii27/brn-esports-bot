import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJI } from './embed.js';

export function paginate(items, pageSize = 10) {
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) pages.push(items.slice(i, i + pageSize));
  if (pages.length === 0) pages.push([]);
  return pages;
}

export function pagerRow(pageIndex, totalPages, prefix = 'pg') {
  const last = totalPages - 1;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}:first:${pageIndex}`).setEmoji(EMOJI.first).setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
    new ButtonBuilder().setCustomId(`${prefix}:prev:${pageIndex}`).setEmoji(EMOJI.arrowL).setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 0),
    new ButtonBuilder().setCustomId(`${prefix}:page:${pageIndex}`).setLabel(`${pageIndex + 1} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${prefix}:next:${pageIndex}`).setEmoji(EMOJI.arrowR).setStyle(ButtonStyle.Primary).setDisabled(pageIndex >= last),
    new ButtonBuilder().setCustomId(`${prefix}:last:${pageIndex}`).setEmoji(EMOJI.last).setStyle(ButtonStyle.Secondary).setDisabled(pageIndex >= last),
  );
}

export async function sendPaginated(interaction, makeEmbed, pages, prefix = 'pg') {
  let i = 0;
  const reply = await interaction.reply({
    embeds: [makeEmbed(pages[i], i, pages.length)],
    components: pages.length > 1 ? [pagerRow(i, pages.length, prefix)] : [],
    fetchReply: true,
  });
  if (pages.length <= 1) return;
  const collector = reply.createMessageComponentCollector({ time: 120_000 });
  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      await btn.reply({ content: 'Ye buttons sirf command run karne wale ke liye hain.', ephemeral: true });
      return;
    }
    const [, action] = btn.customId.split(':');
    if (action === 'first') i = 0;
    else if (action === 'prev') i = Math.max(0, i - 1);
    else if (action === 'next') i = Math.min(pages.length - 1, i + 1);
    else if (action === 'last') i = pages.length - 1;
    await btn.update({ embeds: [makeEmbed(pages[i], i, pages.length)], components: [pagerRow(i, pages.length, prefix)] });
  });
  collector.on('end', async () => {
    try { await reply.edit({ components: [] }); } catch {}
  });
}
