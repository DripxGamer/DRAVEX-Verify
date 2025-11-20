// index.js - Single-file, Railway-ready verification bot (CommonJS)
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------- CONFIG ----------
const CONFIG = {
  TOKEN: process.env.TOKEN,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID || '1439960273027862528',
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  EMOJIS: {
    LOCK: '<:locked:1441125870453657620>',
    BOTAO: '<:bot:1439906396886925352>',
    ANUNCIO: '<:anuncio:1439906320991125575>',
    VERIFICADO: '<:verificado:1439616052115017900>',
    MEMBER: '<:member:1439630214811484272>' // <<--- ADICIONADO AQUI
  }
};

// ---------- Captcha images map ----------
const CAPTCHA_MAP = {
  "FSQPQP": "https://i.imgur.com/dLQ9Rv0.png",
  "SBF2HT": "https://i.imgur.com/Zsyj01b.png",
  "XZMMB0": "https://i.imgur.com/lnajOmu.png",
  "F3RXUR": "https://i.imgur.com/DliZdVn.png",
  "PDSITR": "https://i.imgur.com/BpM03jO.png",
  "HK9STB": "https://i.imgur.com/sSta3rh.png",
  "QW72KP": "https://i.imgur.com/1Pmo1H1.png",
  "MBF6ZR": "https://i.imgur.com/ItqI2aZ.png",
  "T9XQPL": "https://i.imgur.com/L0wbBuG.png",
  "ZKQ8MF": "https://i.imgur.com/ECp4dHd.png",
  "GHS27B": "https://i.imgur.com/ZuW4Y4d.png",
  "PXLQ9T": "https://i.imgur.com/O9w4gto.png",
  "WSN4JP": "https://i.imgur.com/Rcysm1u.png",
  "R8DTXM": "https://i.imgur.com/zbZHxA1.png",
  "JLQP32": "https://i.imgur.com/YDGoUC6.png"
};

// ---------- Estado temporário ----------
const activeCaptchas = new Map();

// ---------- Utils ----------
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
function buildOptions(correct, allCodes, n = 5) {
  const pool = allCodes.filter(c => c !== correct);
  shuffle(pool);
  const chosen = pool.slice(0, n - 1);
  return shuffle([correct, ...chosen]);
}

// ---------- Painel de verificação ----------
async function enviarMensagemVerificacao(channel) {
  try {
    const fetched = await channel.messages.fetch({ limit: 20 });
    const botMsgs = fetched.filter(m => m.author && m.author.id === client.user.id);
    if (botMsgs.size > 0) {
      await channel.bulkDelete(botMsgs).catch(() => {});
    }
  } catch {}

  const embedPrincipal = new EmbedBuilder()
    .setColor('#111214')
    .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
    .setDescription('Para verificar sua conta, clique em **Verificar-se** abaixo.\nUse o segundo botão para ver o motivo desta verificação.')
    .setTimestamp();

  embedPrincipal.setImage("https://i.imgur.com/6mtzQta.png");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verificar')
      .setLabel('Verificar-se')
      .setEmoji(CONFIG.EMOJIS.BOTAO)
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('info_verificacao')
      .setEmoji(CONFIG.EMOJIS.ANUNCIO)
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embedPrincipal],
    components: [row]
  });
}

// ---------- Ready ----------
client.once('clientReady', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!channel) return;
    await enviarMensagemVerificacao(channel);
  } catch (err) {
    console.error(err);
  }
});

// ---------- Interações ----------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Botão INFO
    if (interaction.isButton() && interaction.customId === 'info_verificacao') {
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`${CONFIG.EMOJIS.ANUNCIO} Por que a verificação é necessária?`)
            .setDescription(
              '**A verificação evita bots e selfbots.**\n' +
              'Assim mantemos o servidor seguro contra spam no privado e anúncios.'
            )
        ]
      });
    }

    // Botão VERIFICAR-SE
    if (interaction.isButton() && interaction.customId === 'verificar') {
      const allCodes = Object.keys(CAPTCHA_MAP);
      const correct = allCodes[Math.floor(Math.random() * allCodes.length)];
      const imageUrl = CAPTCHA_MAP[correct];
      const options = buildOptions(correct, allCodes, 5);

      activeCaptchas.set(interaction.user.id, { code: correct, ts: Date.now() });

      const embed = new EmbedBuilder()
        .setColor('#111214')
        .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
        .setImage(imageUrl)
        .setFooter({ text: 'Selecione o texto que aparece na imagem.' });

      // ⬇️ AQUI O EMOJI MEMBER FOI ADICIONADO AO SELECT
      const select = new StringSelectMenuBuilder()
        .setCustomId(`captcha_select_${interaction.user.id}`)
        .setPlaceholder('Selecione o texto que é exibido na imagem.')
        .addOptions(
          options.map(o => ({
            label: o,
            value: o,
            emoji: { id: "1439630214811484272", name: "member" } // <<---- AQUI
          }))
        );

      return interaction.reply({
        ephemeral: true,
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select)]
      });
    }

    // Select Menu
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('captcha_select_')) {
      const record = activeCaptchas.get(interaction.user.id);

      if (!record) {
        return interaction.update({
          content: '❌ Sessão expirada. Clica em Verificar-se novamente.',
          embeds: [],
          components: []
        });
      }

      if (Date.now() - record.ts > 45000) {
        activeCaptchas.delete(interaction.user.id);
        return interaction.update({
          content: '❌ Sessão expirada.',
          embeds: [],
          components: []
        });
      }

      const selected = interaction.values[0];

      if (selected === record.code) {
        activeCaptchas.delete(interaction.user.id);

        try {
          const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
          await interaction.member.roles.add(role);

          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`${CONFIG.EMOJIS.VERIFICADO} Verificação concluída com sucesso!`)
            ],
            components: []
          });
        } catch {
          return interaction.update({
            content: '❌ Erro ao adicionar cargo.',
            embeds: [],
            components: []
          });
        }
      } else {
        activeCaptchas.delete(interaction.user.id);
        return interaction.update({
          content: '❌ Código incorreto!',
          embeds: [],
          components: []
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
});

client.login(CONFIG.TOKEN);
