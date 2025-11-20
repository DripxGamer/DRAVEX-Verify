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
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,

  EMOJIS: {
    MEMBER: { name: "member", id: "1439630214811484272" },
    LOCK: '<:locked:1441125870453657620>',
    BOTAO: '<:bot:1439906396886925352>',
    ANUNCIO: '<:anuncio:1439906320991125575>',
    VERIFICADO: '<:verificado:1439616052115017900>',
    MOD: '<:moderador:1439627925023359007>'
  }
};

// ---------- CAPTCHA ----------
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

const ASSETS = {
  LOGO: "https://i.imgur.com/vGha2WR.png",
  BANNER: "https://i.imgur.com/6mtzQta.png"
};

const activeCaptchas = new Map();

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
function buildOptions(correct, allCodes, n = 5) {
  const pool = allCodes.filter(c => c !== correct);
  shuffle(pool);
  const chosen = pool.slice(0, n - 1);
  return shuffle([correct, ...chosen]);
}

async function enviarMensagemVerificacao(channel) {

  try {
    const fetched = await channel.messages.fetch({ limit: 20 });
    const botMsgs = fetched.filter(m => m.author.id === client.user.id);
    if (botMsgs.size) await channel.bulkDelete(botMsgs);
  } catch {}

  const embed = new EmbedBuilder()
    .setColor('#111214')
    .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
   .setDescription(
  `${CONFIG.EMOJIS.LOCK} Para verificar sua conta, use os botões abaixo.\n` +
  `Use o segundo botão para descobrir o motivo desta verificação.\n` +
  `> **Caso ocorra algum problema, contate a administração.**`)
    .setThumbnail('https://i.imgur.com/mXV0zMT.png')   // 👈 ADICIONADO — LOGO NO CANTO SUPERIOR DIREITO
    .setImage(ASSETS.BANNER)
    .setTimestamp();

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

  await channel.send({ embeds: [embed], components: [row] });
}

client.once("clientReady", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {

if (interaction.customId === "info_verificacao") {
  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle(`${CONFIG.EMOJIS.ANUNCIO} Por que a verificação é necessária?`)
    .setDescription(
      "> **A verificação de captcha é uma medida de segurança essencial.**\n\n" +
      "Ela ajuda a proteger nosso servidor contra bots e selfbots maliciosos que " +
      "enviam mensagens indesejadas ou tentam divulgar conteúdos no privado de nossos membros. " +
      "Esses comportamentos são inconvenientes e podem comprometer a experiência de todos.\n\n" +
      "Com essa verificação, garantimos que apenas pessoas reais tenham acesso, " +
      "mantendo o ambiente seguro e agradável para todos."
    );

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

      if (interaction.customId === "verificar") {
        const codes = Object.keys(CAPTCHA_MAP);
        const correct = codes[Math.floor(Math.random() * codes.length)];
        const options = buildOptions(correct, codes, 5);

        activeCaptchas.set(interaction.user.id, { code: correct, ts: Date.now() });

        const embed = new EmbedBuilder()
          .setColor('#111214')
          .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
          .setImage(CAPTCHA_MAP[correct])
          .setFooter({ text: 'Selecione o texto exibido na imagem.' });

        const select = new StringSelectMenuBuilder()
          .setCustomId(`captcha_select_${interaction.user.id}`)
          .setPlaceholder('Selecione o texto exibido')
          .addOptions(
            options.map(code => ({
              label: code,
              value: code,
              emoji: CONFIG.EMOJIS.MEMBER
            }))
          );

        const row = new ActionRowBuilder().addComponents(select);

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (!interaction.customId.startsWith("captcha_select_")) return;

      const userId = interaction.customId.split("captcha_select_")[1];
      if (interaction.user.id !== userId)
        return interaction.reply({ content: "Esta verificação não é sua.", ephemeral: true });

      const record = activeCaptchas.get(userId);
      if (!record)
        return interaction.update({ content: "Sessão expirada.", embeds: [], components: [] });

      if (Date.now() - record.ts > 45000) {
        activeCaptchas.delete(userId);
        return interaction.update({ content: "Sessão expirada.", embeds: [], components: [] });
      }

      const chosen = interaction.values[0];

      if (chosen !== record.code) {
        activeCaptchas.delete(userId);
        return interaction.update({ content: "❌ Código incorreto!", embeds: [], components: [] });
      }

      const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
      if (!role)
        return interaction.update({ content: "Cargo não encontrado.", embeds: [], components: [] });

      // Já tem cargo
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#2b2d31')
              .setDescription(`${CONFIG.EMOJIS.MOD} Já tens o cargo de verificado!`)
          ],
          components: []
        });
      }

      // Adicionar cargo
      await interaction.member.roles.add(role);
      activeCaptchas.delete(userId);

      const success = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle(`${CONFIG.EMOJIS.VERIFICADO} Verificado com sucesso!`);

      return interaction.update({ embeds: [success], components: [] });
    }
  } catch (err) {
    console.log("Erro:", err);
  }
});

client.login(CONFIG.TOKEN);



