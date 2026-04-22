import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';

async function chat(messages, model = 'gpt-5-mini') {
  const base = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!base || !key) throw new Error('AI not configured.');
  const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_completion_tokens: 1500 }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() ?? '(empty)';
}

export default [
  {
    data: new SlashCommandBuilder().setName('ai-ask').setDescription('AI se kuch puchein')
      .addStringOption(o => o.setName('prompt').setDescription('Question').setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      try {
        const ans = await chat([
          { role: 'system', content: 'You are a helpful, concise assistant. Reply in the same language as the user.' },
          { role: 'user', content: interaction.options.getString('prompt') },
        ]);
        const text = ans.length > 3900 ? ans.slice(0, 3900) + '…' : ans;
        await interaction.editReply({ embeds: [baseEmbed({ title: `${EMOJI.ai}  AI`, description: text, color: COLOR.primary, author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() } })] });
      } catch (e) { await interaction.editReply({ embeds: [err(`AI failed: ${e.message}`)] }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('ai-summarize').setDescription('Lambe text ka summary')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      try {
        const ans = await chat([
          { role: 'system', content: 'Summarize the user text in 3-5 short bullet points. Keep the original language.' },
          { role: 'user', content: interaction.options.getString('text') },
        ]);
        await interaction.editReply({ embeds: [baseEmbed({ title: `${EMOJI.ai}  Summary`, description: ans, color: COLOR.info })] });
      } catch (e) { await interaction.editReply({ embeds: [err(`AI failed: ${e.message}`)] }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('ai-translate').setDescription('Text ko translate karein')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true))
      .addStringOption(o => o.setName('to').setDescription('Target language').setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      const t = interaction.options.getString('text');
      const lang = interaction.options.getString('to');
      try {
        const ans = await chat([
          { role: 'system', content: `Translate the user text to ${lang}. Output only the translation, nothing else.` },
          { role: 'user', content: t },
        ]);
        await interaction.editReply({ embeds: [baseEmbed({ title: `${EMOJI.ai}  Translated → ${lang}`, description: ans, color: COLOR.accent, fields: [{ name: 'Original', value: t.slice(0, 1000) }] })] });
      } catch (e) { await interaction.editReply({ embeds: [err(`AI failed: ${e.message}`)] }); }
    },
  },
];
