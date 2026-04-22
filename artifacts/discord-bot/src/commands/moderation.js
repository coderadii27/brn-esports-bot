import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { baseEmbed, ok, err, COLOR, EMOJI } from '../embed.js';
import { getWarns, markDirty, db } from '../db.js';
import { paginate, sendPaginated } from '../pagination.js';

const need = (interaction, perm) => {
  if (!interaction.memberPermissions?.has(perm)) {
    interaction.reply({ embeds: [err('Aapke paas iss command ko run karne ki permission nahi hai.')], ephemeral: true });
    return false;
  }
  return true;
};

export default [
  {
    data: new SlashCommandBuilder().setName('ban').setDescription('User ko ban karein').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.BanMembers)) return;
      const u = interaction.options.getUser('user');
      const r = interaction.options.getString('reason') ?? 'No reason provided';
      try {
        await interaction.guild.members.ban(u.id, { reason: r });
        await interaction.reply({ embeds: [ok(`**${u.tag}** ko ban kar diya gaya. \nReason: \`${r}\``, 'User Banned')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Ban failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('unban').setDescription('User ko unban karein').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.BanMembers)) return;
      const id = interaction.options.getString('userid');
      try {
        await interaction.guild.members.unban(id);
        await interaction.reply({ embeds: [ok(`User \`${id}\` ko unban kar diya.`, 'Unbanned')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Unban failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('kick').setDescription('User ko kick karein').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.KickMembers)) return;
      const u = interaction.options.getUser('user');
      const r = interaction.options.getString('reason') ?? 'No reason provided';
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.kick(r);
        await interaction.reply({ embeds: [ok(`**${u.tag}** ko kick kar diya. \nReason: \`${r}\``, 'User Kicked')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Kick failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('timeout').setDescription('User ko timeout dein (mute)').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const u = interaction.options.getUser('user');
      const mins = interaction.options.getInteger('minutes');
      const r = interaction.options.getString('reason') ?? 'No reason';
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.timeout(mins * 60_000, r);
        await interaction.reply({ embeds: [ok(`**${u.tag}** ko \`${mins}\` minutes ke liye timeout kiya. \nReason: \`${r}\``, 'Timed out')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Timeout failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('untimeout').setDescription('Timeout hatayein').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const u = interaction.options.getUser('user');
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.timeout(null);
        await interaction.reply({ embeds: [ok(`**${u.tag}** ka timeout hata diya.`, 'Untimed out')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('warn').setDescription('User ko warn karein').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const u = interaction.options.getUser('user');
      const r = interaction.options.getString('reason');
      const list = getWarns(`${interaction.guildId}:${u.id}`);
      list.push({ by: interaction.user.id, reason: r, at: Date.now() });
      markDirty();
      await interaction.reply({ embeds: [ok(`**${u.tag}** warned. Total: \`${list.length}\` \nReason: \`${r}\``, 'Warning Issued')] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('warnings').setDescription('User ke warnings dekho')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    async execute(interaction) {
      const u = interaction.options.getUser('user');
      const list = getWarns(`${interaction.guildId}:${u.id}`);
      if (!list.length) return interaction.reply({ embeds: [baseEmbed({ title: `${EMOJI.info}  Warnings`, description: `**${u.tag}** ke koi warnings nahi hain.`, color: COLOR.info })] });
      const pages = paginate(list, 5);
      await sendPaginated(interaction, (items, idx, total) => baseEmbed({
        title: `${EMOJI.warn}  ${u.tag} — Warnings (${list.length})`,
        color: COLOR.warning,
        description: items.map((w, i) => `**#${idx * 5 + i + 1}** • <t:${Math.floor(w.at / 1000)}:R> by <@${w.by}>\n> ${w.reason}`).join('\n\n'),
        footer: { text: `Page ${idx + 1} / ${total}` },
      }), pages, 'warns');
    },
  },
  {
    data: new SlashCommandBuilder().setName('clearwarn').setDescription('User ke saare warnings clear karein').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const u = interaction.options.getUser('user');
      db().warns[`${interaction.guildId}:${u.id}`] = [];
      markDirty();
      await interaction.reply({ embeds: [ok(`**${u.tag}** ke saare warnings clear kar diye.`)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('purge').setDescription('Messages bulk delete karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(o => o.setName('count').setDescription('Kitne messages').setRequired(true).setMinValue(1).setMaxValue(100)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageMessages)) return;
      const n = interaction.options.getInteger('count');
      try {
        const deleted = await interaction.channel.bulkDelete(n, true);
        await interaction.reply({ embeds: [ok(`\`${deleted.size}\` messages delete kar diye.`)], ephemeral: true });
      } catch (e) { await interaction.reply({ embeds: [err(`Purge failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('slowmode').setDescription('Channel slowmode set karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageChannels)) return;
      const s = interaction.options.getInteger('seconds');
      try {
        await interaction.channel.setRateLimitPerUser(s);
        await interaction.reply({ embeds: [ok(`Slowmode set to \`${s}s\`.`)] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('lock').setDescription('Channel lock karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageChannels)) return;
      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply({ embeds: [ok('Channel lock kar diya. 🔒')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('unlock').setDescription('Channel unlock karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageChannels)) return;
      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        await interaction.reply({ embeds: [ok('Channel unlock kar diya. 🔓')] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('nick').setDescription('User ka nickname change karein').setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('Nickname (empty to reset)')),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageNicknames)) return;
      const u = interaction.options.getUser('user');
      const n = interaction.options.getString('nickname') ?? null;
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.setNickname(n);
        await interaction.reply({ embeds: [ok(`**${u.tag}** ka nickname set: \`${n ?? '(reset)'}\``)] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('addrole').setDescription('User ko role dein').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageRoles)) return;
      const u = interaction.options.getUser('user');
      const r = interaction.options.getRole('role');
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.roles.add(r.id);
        await interaction.reply({ embeds: [ok(`<@${u.id}> ko <@&${r.id}> mil gaya.`)] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
  {
    data: new SlashCommandBuilder().setName('removerole').setDescription('User se role hatayein').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) {
      if (!need(interaction, PermissionFlagsBits.ManageRoles)) return;
      const u = interaction.options.getUser('user');
      const r = interaction.options.getRole('role');
      try {
        const m = await interaction.guild.members.fetch(u.id);
        await m.roles.remove(r.id);
        await interaction.reply({ embeds: [ok(`<@${u.id}> se <@&${r.id}> hata diya.`)] });
      } catch (e) { await interaction.reply({ embeds: [err(`Failed: ${e.message}`)], ephemeral: true }); }
    },
  },
];
