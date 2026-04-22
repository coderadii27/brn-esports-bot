import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { baseEmbed, ok, err, COLOR, EMOJI } from '../embed.js';

export async function handleSelect(interaction) {
  const id = interaction.customId;
  if (id.startsWith('chsel:')) return handleChannelPrivacy(interaction);
}

async function handleChannelPrivacy(interaction) {
  const [, action] = interaction.customId.split(':');
  const makePrivate = action === 'priv';

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.update({ embeds: [err('Aapke paas Manage Channels permission nahi hai.')], components: [] });
  }
  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.update({ embeds: [err('Bot ko **Manage Roles** permission chahiye permissions edit karne ke liye.')], components: [] });
  }

  await interaction.deferUpdate();

  const everyone = interaction.guild.roles.everyone.id;
  const channels = interaction.values
    .map(cid => interaction.guild.channels.cache.get(cid))
    .filter(Boolean);

  const ok2 = [];
  const failed = [];
  for (const ch of channels) {
    try {
      if (makePrivate) {
        const overwrite = { ViewChannel: false };
        // Voice channels: also deny Connect
        if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
          overwrite.Connect = false;
        }
        await ch.permissionOverwrites.edit(everyone, overwrite, { reason: `Made private by ${interaction.user.tag}` });
        // Ensure invoking user keeps access
        await ch.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, ...(ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice ? { Connect: true } : {}) }, { reason: 'Author preserved access' });
      } else {
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: null, Connect: null }, { reason: `Made public by ${interaction.user.tag}` });
      }
      ok2.push(ch);
    } catch (e) {
      failed.push({ ch, msg: e.message });
    }
  }

  const emoji = makePrivate ? '🔒' : '🔓';
  const verb = makePrivate ? 'private' : 'public';
  const fields = [];
  if (ok2.length) fields.push({ name: `${emoji}  Updated (${ok2.length})`, value: ok2.map(c => `<#${c.id}>`).join(' ').slice(0, 1024) });
  if (failed.length) fields.push({ name: `⚠️  Failed (${failed.length})`, value: failed.map(f => `<#${f.ch.id}> — \`${f.msg}\``).join('\n').slice(0, 1024) });

  await interaction.editReply({
    embeds: [baseEmbed({
      title: `${emoji}  Channels made ${verb}`,
      color: failed.length ? COLOR.warning : (makePrivate ? COLOR.warning : COLOR.success),
      fields,
      footer: { text: `By ${interaction.user.tag}` },
      timestamp: new Date().toISOString(),
    })],
    components: [],
  });
}
