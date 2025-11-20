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
  // fallback para o canal que o utilizador forneceu
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID || '1439960273027862528',
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  EMOJIS: {
    LOCK: '<:locked:1441125870453657620>',
    BOTAO: '<:bot:1439906396886925352>',
    ANUNCIO: '<:anuncio:1439906320991125575>',
    VERIFICADO: '<:verificado:1439616052115017900>',
    MOD: '<:moderador:1439627925023359007>' // emoji acrescentado nos códigos
  }
};

// ---------- Captcha images map (code -> image URL) ----------
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

// ---------- Assets (usamos apenas Imgur — sem ficheiros locais) ----------
const ASSETS = {
  LOGO: "https://i.imgur.com/vGha2WR.png",
  BANNER_IMGUR: "https://i.imgur.com/6mtzQta.png"
};

// ---------- Estado temporário ----------
const activeCaptchas = new Map(); // userId -> { code, ts }

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

// ---------- Função: enviar painel de verificação (não apaga painel existente) ----------
async function enviarMensagemVerificacao(channel) {
  try {
    // verifica se já existe um painel do bot com título "VERIFICAÇÃO" (evita duplicados e apagar)
    const messages = await channel.messages.fetch({ limit: 50 });
    const existing = messages.find(m =>
      m.author && m.author.id === client.user.id &&
      m.embeds && m.embeds[0] && typeof m.embeds[0].title === 'string' &&
      m.embeds[0].title.toUpperCase().includes('VERIFICAÇÃO')
    );

    if (existing) {
      console.log('Painel já existe no canal — não vou enviar outro.');
      return;
    }
  } catch (err) {
    console.log('Aviso: não consegui verificar existência do painel (continuando):', err.message || err);
    // não bloqueia; continua para enviar painel
  }

  const embedPrincipal = new EmbedBuilder()
    .setColor('#111214')
    .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
    .setDescription('Para verificar sua conta, clique em **Verificar-se** abaixo.\nUse o segundo botão para ver o motivo desta verificação.')
    .setImage(ASSETS.BANNER_IMGUR)
    .setFooter({ text: 'Caso ocorra algum problema, contate a administração.' })
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

  await channel.send({
    embeds: [embedPrincipal],
    components: [row]
  });

  console.log('Painel enviado.');
}

// ---------- Evento: clientReady (usamos clientReady para evitar warning futuro) ----------
client.once('clientReady', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!channel) {
      console.log('❌ Canal de verificação inválido. VERIFICATION_CHANNEL_ID está bem definido?');
      return;
    }
    await enviarMensagemVerificacao(channel);
  } catch (err) {
    console.error('Erro ao enviar painel ao iniciar:', err);
  }
});

// ---------- Interações: botões + select ----------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // botão "Por que a verificação é necessária?"
    if (interaction.isButton() && interaction.customId === 'info_verificacao') {
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`${CONFIG.EMOJIS.ANUNCIO} Por que a verificação é necessária?`)
        .setDescription(
          '**A verificação de captcha é uma medida de segurança essencial.**\n\n' +
          'Ela ajuda a proteger nosso servidor contra bots e selfbots maliciosos que enviam mensagens indesejadas ou tentam divulgar conteúdos no privado de nossos membros. Mantemos o servidor seguro e agradável.'
        )
        .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // botão "Verificar-se" — envia a imagem do captcha + select (ephemeral)
    if (interaction.isButton() && interaction.customId === 'verificar') {
      const allCodes = Object.keys(CAPTCHA_MAP);
      const correct = allCodes[Math.floor(Math.random() * allCodes.length)];
      const imageUrl = CAPTCHA_MAP[correct];
      const options = buildOptions(correct, allCodes, 5);

      // guarda estado temporário (timestamp para TTL de 45s)
      activeCaptchas.set(interaction.user.id, { code: correct, ts: Date.now() });

      const embed = new EmbedBuilder()
        .setColor('#111214')
        .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
        .setImage(imageUrl)
        .setFooter({ text: 'Selecione o texto que aparece na imagem.' });

      // adiciona o emoji de moderador nas labels (como na tua screenshot)
      const select = new StringSelectMenuBuilder()
        .setCustomId(`captcha_select_${interaction.user.id}`)
        .setPlaceholder('Selecione o texto que é exibido na imagem.')
        .addOptions(options.map(o => ({
          label: `${CONFIG.EMOJIS.MOD} ${o}`,
          value: o
        })));

      const row = new ActionRowBuilder().addComponents(select);

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // select menu resposta
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('captcha_select_')) {
      const expectedUserId = interaction.customId.split('captcha_select_')[1];
      if (interaction.user.id !== expectedUserId) {
        return interaction.reply({ content: 'Esta verificação não é sua.', ephemeral: true });
      }

      const record = activeCaptchas.get(interaction.user.id);
      if (!record) {
        return interaction.update({ content: '❌ Sessão expirada. Clica em Verificar-se novamente.', embeds: [], components: [] });
      }

      // TTL 45s
      if (Date.now() - record.ts > 45_000) {
        activeCaptchas.delete(interaction.user.id);
        return interaction.update({ content: '❌ Sessão expirada. Clica em Verificar-se novamente.', embeds: [], components: [] });
      }

      const selected = interaction.values[0];
      if (selected === record.code) {
        // sucesso — tenta adicionar cargo
        try {
          const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
          if (!role) return interaction.update({ content: '❌ Erro: cargo de verificação não encontrado.', embeds: [], components: [] });

          await interaction.member.roles.add(role);

          activeCaptchas.delete(interaction.user.id);

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle(`${CONFIG.EMOJIS.VERIFICADO} Verificação concluída com sucesso!`)
            .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

          return interaction.update({ content: null, embeds: [successEmbed], components: [] });
        } catch (err) {
          console.error('Erro ao adicionar cargo:', err);
          return interaction.update({ content: '❌ Erro ao adicionar cargo. Verifica permissões do bot.', embeds: [], components: [] });
        }
      } else {
        activeCaptchas.delete(interaction.user.id);
        return interaction.update({ content: '❌ Código incorreto! Tenta novamente.', embeds: [], components: [] });
      }
    }
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true });
      }
    } catch (e) {
      console.error('Erro ao enviar fallback de erro:', e);
    }
  }
});

// ---------- Login ----------
client.login(CONFIG.TOKEN).catch(err => {
  console.error('Falha ao fazer login. Verifica TOKEN nas env vars.', err);
});
