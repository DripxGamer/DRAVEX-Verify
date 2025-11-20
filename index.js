// index.js - Railway ready (CommonJS)
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

// ---------- CONFIG (via Railway env vars) ----------
const CONFIG = {
  TOKEN: process.env.TOKEN,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  EMOJIS: {
    LOCK: '<:locked:1441125870453657620>',
    BOTAO: '<:bot:1439906396886925352>',
    ANUNCIO: '<:anuncio:1439906320991125575>',
    VERIFICADO: '<:verificado:1439616052115017900>'
  }
};

// ---------- Captchas (código -> imagem URL) ----------
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

// ---------- Assets principais (tu enviou estes links) ----------
const ASSETS = {
  LOGO: "https://i.imgur.com/vGha2WR.png",        // Logo que pediste
  BANNER_IMGUR: "https://i.imgur.com/6mtzQta.png", // Banner Imgur (fallback)
  // local banner path (developer instruction requested usage of local uploaded file path)
  BANNER_LOCAL_PATH: "/mnt/data/25254221-c48f-4c2d-8349-a602386aa187.png"
};

// ---------- Estado temporário por utilizador ----------
const activeCaptchas = new Map(); // userId -> { code, timestamp }

// ---------- Utils ----------
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// retorna N opções falsas + o correto, embaralhado
function buildOptions(correct, allCodes, n = 5) {
  const pool = allCodes.filter(c => c !== correct);
  shuffle(pool);
  const chosen = pool.slice(0, n - 1);
  const opts = shuffle([correct, ...chosen]);
  return opts;
}

// ---------- Função que envia o painel EXACTO ao iniciar ----------
async function enviarMensagemVerificacao(channel) {
  // tenta limpar mensagens antigas do bot no canal
  try {
    const fetched = await channel.messages.fetch({ limit: 20 });
    const botMsgs = fetched.filter(m => m.author && m.author.id === client.user.id);
    if (botMsgs.size > 0) {
      await channel.bulkDelete(botMsgs).catch(() => {});
    }
  } catch (err) {
    console.log("Aviso: não foi possível apagar mensagens antigas:", err.message || err);
  }

  const embedPrincipal = new EmbedBuilder()
    .setColor('#111214')
    .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
    .setDescription('Para verificar sua conta, clique em **Verificar-se** abaixo.\nUse o segundo botão para ver o motivo desta verificação.')
    .setFooter({ text: 'Caso ocorra algum problema, contate a administração.' })
    // aqui usamos a imagem local como attachment (developer request)
    .setImage('attachment://banner.png')
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

  // envia com o ficheiro local (path que está disponível no worker)
  await channel.send({
    embeds: [embedPrincipal],
    files: [
      // local path que mencionámos anteriormente — o sistema de deploy tratará este ficheiro.
      { attachment: ASSETS.BANNER_LOCAL_PATH, name: "banner.png" }
    ],
    components: [row]
  });
}

// ---------- Evento: cliente pronto (clientReady conforme tu pediste) ----------
client.once('clientReady', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // busca canal de verificação a partir da env
  try {
    const channel = await client.channels.fetch(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!channel) return console.log('❌ Canal de verificação inválido. Define VERIFICATION_CHANNEL_ID nas env vars.');
    await enviarMensagemVerificacao(channel);
    console.log('✅ Painel enviado automaticamente.');
  } catch (err) {
    console.error('Erro ao enviar painel ao iniciar:', err);
  }
});

// ---------- Interações (botões + select) ----------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // BOTÃO: por que motivo / info
    if (interaction.isButton() && interaction.customId === 'info_verificacao') {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`${CONFIG.EMOJIS.ANUNCIO} Por que a verificação é necessária?`)
            .setDescription(
              '**A verificação de captcha é uma medida de segurança essencial.**\n\n' +
              'Ela ajuda a proteger nosso servidor contra bots e selfbots maliciosos que enviam mensagens indesejadas ou tentam divulgar conteúdos no privado de nossos membros.'
            )
            .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' })
        ]
      });
      return;
    }

    // BOTÃO: iniciar verificação (envia a imagem do captcha + select)
    if (interaction.isButton() && interaction.customId === 'verificar') {
      // seleciona aleatoriamente 1 codigo correto
      const allCodes = Object.keys(CAPTCHA_MAP);
      const correct = allCodes[Math.floor(Math.random() * allCodes.length)];
      const imageUrl = CAPTCHA_MAP[correct];

      // constrói 5 opções (1 correta + 4 falsas)
      const opts = buildOptions(correct, allCodes, 5);

      // guarda estado temporário (30s TTL)
      activeCaptchas.set(interaction.user.id, { code: correct, ts: Date.now() });

      const embed = new EmbedBuilder()
        .setColor('#111214')
        .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
        .setImage(imageUrl)
        .setFooter({ text: 'Selecione o texto que aparece na imagem.' });

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`captcha_select_${interaction.user.id}`)
        .setPlaceholder('Selecione o texto que é exibido na imagem.')
        .addOptions(
          opts.map(o => ({ label: o, value: o }))
        );

      const row = new ActionRowBuilder().addComponents(menu);

      // respondemos de forma ephemeral (só o user vê)
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // SELECT: usuário escolheu uma opção
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('captcha_select_')) {
      const userIdFromCustomId = interaction.customId.split('_').slice(-1)[0];
      // impedir users diferentes de responder à select de outro user
      if (interaction.user.id !== userIdFromCustomId) {
        return interaction.reply({ content: 'Esta seleção não é para ti.', ephemeral: true });
      }

      const selected = interaction.values[0];
      const record = activeCaptchas.get(interaction.user.id);

      if (!record) {
        return interaction.update({ content: '❌ Sessão expirada. Clica em Verificar-se novamente.', embeds: [], components: [] });
      }

      // TTL check (30s)
      if (Date.now() - record.ts > 30_000) {
        activeCaptchas.delete(interaction.user.id);
        return interaction.update({ content: '❌ Sessão expirada. Clica em Verificar-se novamente.', embeds: [], components: [] });
      }

      if (selected === record.code) {
        // tenta adicionar cargo
        try {
          const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
          if (!role) {
            return interaction.update({ content: '❌ Erro: cargo de verificação não encontrado.', embeds: [], components: [] });
          }
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
      console.error('Erro a enviar erro de interação:', e);
    }
  }
});

// ---------- Login ----------
client.login(CONFIG.TOKEN).catch(err => {
  console.error('Falha ao fazer login. Verifica TOKEN nas env vars.', err);
});
