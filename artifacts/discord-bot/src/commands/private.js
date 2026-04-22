import { SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';

const data = new SlashCommandBuilder()
  .setName('private')
  .setDescription('Channels ko select karke private/public karein')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels.toString())
  .addSubcommand(s => s.setName('hide').setDescription('Select karke channels ko private banao'))
  .addSubcommand(s => s.setName('show').setDescription('Select karke channels ko public banao'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const action = sub === 'hide' ? 'priv' : 'pub';
  const verb = sub === 'hide' ? 'Private' : 'Public';
  const emoji = sub === 'hide' ? '🔒' : '🔓';

  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(`chsel:${action}`)
    .setPlaceholder(`${emoji} Channels select karo (max 25)`)
    .setMinValues(1)
    .setMaxValues(25)
    .addChannelTypes(
      ChannelType.GuildText,
      ChannelType.GuildVoice,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildForum,
      ChannelType.GuildStageVoice,
    );

  const e = baseEmbed({
    title: `${emoji}  Make Channels ${verb}`,
    description: sub === 'hide'
      ? '@everyone se **View Channel** permission hat jayegi. Aap aur jin roles ko already access hai unpe asar nahi padega.\n\n_Niche menu se channels select karo._'
      : '@everyone ke liye **View Channel** permission wapas allow ho jayegi.\n\n_Niche menu se channels select karo._',
    color: sub === 'hide' ? COLOR.warning : COLOR.success,
  });

  await interaction.reply({ embeds: [e], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
}

export default [{ data, execute }];
