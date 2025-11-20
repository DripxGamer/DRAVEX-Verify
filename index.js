const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

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
    
    // Embaralha as opções
    return options.sort(() => Math.random() - 0.5);
}

// Evento quando o bot está pronto
client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    enviarMensagemVerificacao();
});

// Função para enviar a mensagem inicial de verificação
async function enviarMensagemVerificacao() {
    const channel = client.channels.cache.get(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!channel) {
        console.error('❌ Canal de verificação não encontrado!');
        return;
    }

    // Limpa mensagens antigas do bot
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    await channel.bulkDelete(botMessages).catch(console.error);

    // Embed principal
    const embedPrincipal = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${CONFIG.EMOJIS.LOCKED} VERIFICAÇÃO`)
        .setDescription('Para verificar sua conta, use os botões abaixo.\nUse o segundo botão para descobrir o motivo desta verificação.')
        .setFooter({ text: 'Caso ocorra algum problema, contate a administração.' })
        .setTimestamp();

    // Botões
    const row = new ActionRowBuilder()
        .addComponents(
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

    console.log('✅ Mensagem de verificação enviada!');
}

// Evento de interação com botões e menus
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    // Botão "Verificar-se"
    if (interaction.customId === 'verificar') {
        const member = interaction.member;
        
        // Verifica se já está verificado
        if (member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
            return interaction.reply({
                content: '✅ Você já está verificado!',
                ephemeral: true
            });
        }

        // Gera CAPTCHA
        const captchaCode = generateCaptcha();
        activeCaptchas.set(interaction.user.id, captchaCode);

        // Cria imagem do CAPTCHA (embed com texto estilizado)
        const embedCaptcha = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📝 VERIFICAÇÃO')
            .setDescription(`\`\`\`\n${captchaCode}\n\`\`\``)
            .addFields({
                name: 'Instruções',
                value: 'Selecione o texto que é exibido na imagem.'
            })
            .setFooter({ text: 'Selecione a opção correta abaixo' });

        // Opções do menu
        const options = generateFakeOptions(captchaCode);
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('captcha_select')
            .setPlaceholder('Selecione o texto que é exibido na imagem.')
            .addOptions(
                options.map(opt => ({
                    label: opt,
                    value: opt,
                    emoji: '🔒'
                }))
            );

        const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embedCaptcha],
            components: [rowSelect],
            ephemeral: true
        });
    }

    // Botão "Por que a verificação é necessária?"
    if (interaction.customId === 'info_verificacao') {
        const embedInfo = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`${CONFIG.EMOJIS.DEVELOPER} Por que a verificação é necessária?`)
            .setDescription('**A verificação de captcha é uma medida de segurança essencial.**\n\nEla ajuda a proteger nosso servidor contra bots e selfbots maliciosos que enviam mensagens indesejadas ou tentam divulgar conteúdos no privado de nossos membros. Esses comportamentos são inconvenientes e podem comprometer a experiência de todos.\n\nCom essa verificação, garantimos que apenas pessoas reais tenham acesso, mantendo o ambiente seguro e agradável para todos.')
            .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

        await interaction.reply({
            embeds: [embedInfo],
            ephemeral: true
        });
    }

    // Seleção do CAPTCHA
    if (interaction.customId === 'captcha_select') {
        const selectedValue = interaction.values[0];
        const correctCaptcha = activeCaptchas.get(interaction.user.id);

        if (!correctCaptcha) {
            return interaction.update({
                content: '❌ Sessão expirada. Por favor, clique em "Verificar-se" novamente.',
                embeds: [],
                components: []
            });
        }

        if (selectedValue === correctCaptcha) {
            // CAPTCHA correto - adiciona o cargo
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);

            if (role) {
                await member.roles.add(role);
                
                const embedSucesso = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${CONFIG.EMOJIS.VERIFIED} Verificação concluída com sucesso!`)
                    .setDescription('*(editado)*')
                    .setFooter({ text: 'Só você pode ver esta mensagem • Ignorar mensagem' });

                await interaction.update({
                    embeds: [embedSucesso],
                    components: []
                });

                activeCaptchas.delete(interaction.user.id);
            } else {
                await interaction.update({
                    content: '❌ Erro: Cargo de verificação não encontrado!',
                    embeds: [],
                    components: []
                });
            }
        } else {
            // CAPTCHA incorreto
            activeCaptchas.delete(interaction.user.id);
            
            await interaction.update({
                content: '❌ Código incorreto! Por favor, tente novamente clicando em "Verificar-se".',
                embeds: [],
                components: []
            });
        }
    }
});

// Comando para reenviar a mensagem de verificação (admin)
client.on('messageCreate', async message => {
    if (message.content === '!setup-verificacao' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await enviarMensagemVerificacao();
        await message.delete().catch(() => {});
    }
});

// Login do bot
client.login(CONFIG.TOKEN);