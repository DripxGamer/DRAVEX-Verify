const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionFlagsBits
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configurações via Railway Environment
const CONFIG = {
    TOKEN: process.env.TOKEN,
    VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,
    VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
    EMOJIS: {
        LOCKED: '<:locked:1441125870453657620>',
        VERIFIED: '<:verificado:1439616052115017900>',
        DEVELOPER: '<:developer:1439905568100843580>'
    }
};

// Captchas ativos
const activeCaptchas = new Map();

// Gerador de CAPTCHA
function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Criar opções falsas
function generateFakeOptions(correctCode) {
    const options = [correctCode];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    while (options.length < 5) {
        const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        if (!options.includes(code)) options.push(code);
    }

    return options.sort(() => Math.random() - 0.5);
}

// Painel inicial
async function enviarMensagemVerificacao(channel) {

    // Limpar mensagens antigas
    try {
        const messages = await channel.messages.fetch({ limit: 20 });
        const botMsgs = messages.filter(m => m.author.id === client.user.id);
        if (botMsgs.size > 0) await channel.bulkDelete(botMsgs);
    } catch {}

    const embedPrincipal = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${CONFIG.EMOJIS.LOCKED} VERIFICAÇÃO`)
        .setDescription('Para verificar sua conta, use os botões abaixo.\nUse o segundo botão para descobrir o motivo desta verificação.')
        .setFooter({ text: 'Caso ocorra algum problema, contate a administração.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('verificar')
            .setLabel('Verificar-se')
            .setEmoji(CONFIG.EMOJIS.VERIFIED)
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('info_verificacao')
            .setEmoji(CONFIG.EMOJIS.DEVELOPER)
            .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
        embeds: [embedPrincipal],
        components: [row]
    });

    console.log("✅ Painel enviado automaticamente!");
}

/* ⚠️ ESTE É O EVENTO CORRETO NO TEU DISCORD.JS:
   "clientReady" e NÃO "ready" */
client.on("clientReady", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);

    const channel = client.channels.cache.get(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!channel) return console.log("❌ ERRO: canal de verificação inválido!");

    await enviarMensagemVerificacao(channel);
});

// 🎯 Interações
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    try {
        // Botão verificar
        if (interaction.customId === 'verificar') {
            await interaction.deferReply({ ephemeral: true });

            const member = interaction.member;

            if (member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
                return interaction.editReply({ content: '✅ Você já está verificado!' });
            }

            const captcha = generateCaptcha();
            activeCaptchas.set(interaction.user.id, captcha);

            const embedCaptcha = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('VERIFICAÇÃO')
                .setDescription(`\`\`\`\n${captcha}\n\`\`\``)
                .setFooter({ text: 'Selecione o texto que é exibido na imagem.' });

            const options = generateFakeOptions(captcha);

            const menu = new StringSelectMenuBuilder()
                .setCustomId('captcha_select')
                .setPlaceholder('Selecione o texto correto.')
                .addOptions(
                    options.map(o => ({
                        label: o,
                        value: o,
                        emoji: '🔒'
                    }))
                );

            await interaction.editReply({
                embeds: [embedCaptcha],
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        // Botão motivo
        if (interaction.customId === 'info_verificacao') {
            await interaction.deferReply({ ephemeral: true });

            const embedInfo = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`${CONFIG.EMOJIS.DEVELOPER} Por que a verificação é necessária?`)
                .setDescription('Para aumentar a segurança do servidor e prevenir bots e selfbots.')
                .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

            await interaction.editReply({ embeds: [embedInfo] });
        }

        // CAPTCHA
        if (interaction.customId === 'captcha_select') {

            await interaction.deferUpdate();

            const answer = interaction.values[0];
            const expected = activeCaptchas.get(interaction.user.id);

            if (!expected) {
                return interaction.editReply({
                    content: '❌ Sessão expirada, tente novamente.',
                    embeds: [],
                    components: []
                });
            }

            if (answer !== expected) {
                activeCaptchas.delete(interaction.user.id);
                return interaction.editReply({
                    content: '❌ Código incorreto! Clique novamente em "Verificar-se".',
                    embeds: [],
                    components: []
                });
            }

            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);

            if (!role) {
                return interaction.editReply({
                    content: '❌ Erro: cargo não encontrado!',
                    components: []
                });
            }

            await member.roles.add(role);

            const success = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${CONFIG.EMOJIS.VERIFIED} Verificação concluída!`)
                .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

            activeCaptchas.delete(interaction.user.id);

            await interaction.editReply({
                embeds: [success],
                components: []
            });
        }

    } catch (err) {
        console.log("Erro:", err);
    }
});

// Login
client.login(CONFIG.TOKEN);
