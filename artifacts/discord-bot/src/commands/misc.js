import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, ok, err, info, COLOR, EMOJI } from '../embed.js';
import { db, markDirty } from '../db.js';

export default [
  {
    data: new SlashCommandBuilder().setName('suggest').setDescription('Suggestion submit karein')
      .addStringOption(o => o.setName('text').setDescription('Suggestion').setRequired(true)),
    async execute(interaction) {
      const t = interaction.options.getString('text');
      db().suggestions.push({ userId: interaction.user.id, guildId: interaction.guildId, text: t, at: Date.now() });
      markDirty();
      const e = baseEmbed({
        title: `💡  New Suggestion`,
        description: t,
        color: COLOR.primary,
        author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() },
      });
      const msg = await interaction.reply({ embeds: [e], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
    },
  },
  {
    data: new SlashCommandBuilder().setName('feedback').setDescription('Bot ke baare me feedback dein')
      .addStringOption(o => o.setName('text').setDescription('Feedback').setRequired(true)),
    async execute(interaction) {
      db().feedback.push({ userId: interaction.user.id, text: interaction.options.getString('text'), at: Date.now() });
      markDirty();
      await interaction.reply({ embeds: [ok('Thank you! Aapka feedback record ho gaya.')], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('report').setDescription('User ko report karein')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    async execute(interaction) {
      const u = interaction.options.getUser('user');
      const r = interaction.options.getString('reason');
      db().reports.push({ by: interaction.user.id, target: u.id, guildId: interaction.guildId, reason: r, at: Date.now() });
      markDirty();
      await interaction.reply({ embeds: [ok(`Report submit ho gayi against <@${u.id}>.`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('afk').setDescription('Apne aapko AFK mark karein')
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
    async execute(interaction) {
      const r = interaction.options.getString('reason') ?? 'AFK';
      db().afk[interaction.user.id] = { reason: r, at: Date.now() };
      markDirty();
      await interaction.reply({ embeds: [ok(`AFK set: ${r}\nKisi ne aapko mention kiya toh main bata dunga.`)], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('snipe').setDescription('Last deleted message dekho'),
    async execute(interaction) {
      const s = db().snipes[interaction.channelId];
      if (!s) return interaction.reply({ embeds: [info('Iss channel me kuch snipe karne ko nahi.')], ephemeral: true });
      await interaction.reply({ embeds: [baseEmbed({ title: '👀  Sniped', description: s.content || '_(no content)_', author: { name: s.author }, color: COLOR.warning, footer: { text: `Deleted • ${new Date(s.at).toLocaleTimeString()}` } })] });
    },
  },
  {
    data: new SlashCommandBuilder().setName('help').setDescription('Saari commands dekho'),
    async execute(interaction) {
      const cmds = [...interaction.client.commands.values()];
      const cats = {
        'Info & Utility': ['ping','botinfo','uptime','serverinfo','userinfo','avatar','banner','roleinfo','channelinfo','emojis','members','invite'],
        'Moderation': ['ban','unban','kick','timeout','untimeout','warn','warnings','clearwarn','purge','slowmode','lock','unlock','nick','addrole','removerole'],
        'Utility': ['poll','multipoll','remindme','timer','calc','base64encode','base64decode','hash','color','qrcode','shorten','choose','reverse','uppercase','lowercase'],
        'Fun': ['8ball','dice','coinflip','rps','joke','fact','quote','pickup','roast','compliment','ascii','mock','clap','lovecalc','say'],
        'Games': ['tictactoe','guessnumber','trivia','hangman','wyr','truthordare','riddle','coin-game'],
        'Economy': ['eco balance','eco daily','eco weekly','eco work','eco beg','eco rob','eco deposit','eco withdraw','eco pay','eco leaderboard','eco shop','eco buy','eco inventory'],
        'Leveling': ['rank','xp-leaderboard','addxp','resetxp','setlevel'],
        'Tickets': ['ticket-setup','ticket-open','ticket-close','ticket-add'],
        'Notes & Todos': ['note-add','note-list','note-remove','note-clear','todo-add','todo-list','todo-done','todo-remove'],
        'Server Config': ['setwelcome','setlog','setautorole','setmodrole','settings-view','resetconfig'],
        'Tournament': ['tournament setup','tournament panel','tournament list','tournament delete'],
        'Channel Privacy': ['private hide','private show'],
        'AI': ['ai-ask','ai-summarize','ai-translate'],
        'Misc': ['suggest','feedback','report','afk','snipe','help'],
      };
      const fields = Object.entries(cats).map(([name, list]) => ({
        name: `${name} (${list.length})`,
        value: list.map(c => `\`/${c}\``).join(' '),
      }));
      const e = baseEmbed({
        title: `${EMOJI.spark}  All Commands (${cmds.length})`,
        description: '*Smooth, premium, all-in-one. Try any command below.*',
        color: COLOR.primary,
        fields,
      });
      await interaction.reply({ embeds: [e], ephemeral: true });
    },
  },
];
