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

// Configurações usando variáveis de ambiente
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

// Armazena captchas ativos (user_id: captcha_code)
const activeCaptchas = new Map();

// Função para gerar código CAPTCHA aleatório
function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return captcha;
}

// Função para criar opções falsas do CAPTCHA
function generateFakeOptions(correctCode) {
    const options = [correctCode];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    while (options.length < 5) {
        let fakeCode = '';
        for (let i = 0; i < 6; i++) {
            fakeCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (!options.includes(fakeCode)) {
            options.push(fakeCode);
        }
    }

    return options.sort(() => Math.random() - 0.5);
}

// Evento quando o bot está pronto (ATUALIZADO)
client.once('clientReady', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// Função para enviar o painel de verificação bonito (igual ao da imagem)
async function enviarMensagemVerificacao(channel) {
    // Limpar mensagens antigas
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        await channel.bulkDelete(botMessages).catch(() => {});
    } catch {}

    const embedPrincipal = new EmbedBuilder()
        .setColor('#111214')
        .setTitle(`${CONFIG.EMOJIS.LOCKED} VERIFICAÇÃO`)
        .setDescription(
            'Para verificar sua conta, use os botões abaixo.\n' +
            'Use o segundo botão para descobrir o motivo desta verificação.'
        )
        .addFields({
            name: '\u200B',
            value: '> **Caso ocorra algum problema, contate a administração.**'
        })
        .setThumbnail('https://i.imgur.com/x49WQyW.png') // Ícone igual ao do print
        .setImage('https://i.imgur.com/qZGE8hH.png')    // Banner igual ao print
        .setFooter({ text: 'Sistema de Verificação — Jotah Store' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verificar')
                .setLabel('Verificar-se')
                .setEmoji(CONFIG.EMOJIS.VERIFIED)
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('info_verificacao')
                .setEmoji(CONFIG.EMOJIS.DEVELOPER)
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({
        embeds: [embedPrincipal],
        components: [row]
    });

    console.log('✅ Painel de verificação enviado!');
}

// Evento de interação
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    try {
        // BOTÃO VERIFICAR-SE
        if (interaction.customId === 'verificar') {
            await interaction.deferReply({ ephemeral: true });

            const member = interaction.member;

            if (member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
                return interaction.editReply({ content: '✅ Você já está verificado!' });
            }

            const captcha = generateCaptcha();
            activeCaptchas.set(interaction.user.id, captcha);

            const embedCaptcha = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle(`${CONFIG.EMOJIS.LOCKED} VERIFICAÇÃO`)
                .setDescription(`**${captcha}**\n\n**Instruções:**\nSelecione o texto exibido acima.`)
                .setFooter({ text: 'Selecione abaixo a opção correta' });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('captcha_select')
                .setPlaceholder('Selecione a opção correta')
                .addOptions(
                    generateFakeOptions(captcha).map(opt => ({
                        label: opt,
                        value: opt,
                        emoji: '🔒'
                    }))
                );

            const rowSelect = new ActionRowBuilder().addComponents(menu);

            await interaction.editReply({
                embeds: [embedCaptcha],
                components: [rowSelect]
            });
        }

        // BOTÃO INFORMAÇÕES
        if (interaction.customId === 'info_verificacao') {
            await interaction.deferReply({ ephemeral: true });

            const embedInfo = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle(`${CONFIG.EMOJIS.DEVELOPER} Por que a verificação é necessária?`)
                .setDescription(
                    '**A verificação de captcha é uma medida de segurança essencial.**\n\n' +
                    'Ela impede que bots e selfbots maliciosos entrem no servidor e perturbem os membros. ' +
                    'Assim garantimos um ambiente seguro e limpo para todos.'
                )
                .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

            await interaction.editReply({ embeds: [embedInfo] });
        }

        // CAPTCHA
        if (interaction.customId === 'captcha_select') {
            const selected = interaction.values[0];
            const correct = activeCaptchas.get(interaction.user.id);

            if (!correct) {
                return interaction.update({
                    content: '❌ Sessão expirada, clique novamente em "Verificar-se".',
                    embeds: [],
                    components: []
                });
            }

            if (selected === correct) {
                const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);

                try {
                    await interaction.member.roles.add(role);

                    const embedOK = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle(`${CONFIG.EMOJIS.VERIFIED} Verificação concluída com sucesso!`)
                        .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

                    await interaction.update({
                        embeds: [embedOK],
                        components: []
                    });

                    activeCaptchas.delete(interaction.user.id);

                } catch (e) {
                    await interaction.update({
                        content: '❌ Erro ao adicionar cargo. Permissões insuficientes.',
                        embeds: [],
                        components: []
                    });
                }
            } else {
                activeCaptchas.delete(interaction.user.id);

                await interaction.update({
                    content: '❌ Código incorreto! Clique novamente em "Verificar-se".',
                    embeds: [],
                    components: []
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
});

// Comando para reenviar a mensagem de verificação (admin)
client.on('messageCreate', async message => {
    if (
        message.content === '!setup-verificacao' && 
        message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        await enviarMensagemVerificacao(message.channel);
        await message.delete().catch(() => {});
    }
});

// Login
client.login(CONFIG.TOKEN);
