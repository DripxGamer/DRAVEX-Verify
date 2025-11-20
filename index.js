const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Config
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

// CAPTCHA ativos
const captchas = new Map();

// Gera código
function gerarCaptcha() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// Gera opções fake
function gerarOpcoes(code) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const arr = [code];

    while (arr.length < 5) {
        let fake = "";
        for (let i = 0; i < 6; i++) fake += chars[Math.floor(Math.random() * chars.length)];
        if (!arr.includes(fake)) arr.push(fake);
    }

    return arr.sort(() => Math.random() - 0.5);
}

// Enviar PAINEL automaticamente ao iniciar
client.once("ready", async () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);

    const canal = await client.channels.fetch(CONFIG.VERIFICATION_CHANNEL_ID);
    if (!canal) return console.log("❌ Canal de verificação inválido.");

    // Apaga mensagens antigas
    try {
        const msgs = await canal.messages.fetch({ limit: 20 });
        const botMsgs = msgs.filter(m => m.author.id === client.user.id);
        canal.bulkDelete(botMsgs).catch(() => {});
    } catch {}

    // Embed estilo imagem
    const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`${CONFIG.EMOJIS.LOCK} VERIFICAÇÃO`)
        .setDescription(`Para verificar sua conta, use os botões abaixo.\nUse o segundo botão para descobrir o motivo desta verificação.`)
        .setImage("attachment://banner.png")
        .setFooter({ text: "Caso ocorra algum problema, contate a administração." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("verificar")
            .setLabel("Verificar-se")
            .setEmoji(CONFIG.EMOJIS.BOTAO)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("motivo")
            .setEmoji(CONFIG.EMOJIS.ANUNCIO)
            .setStyle(ButtonStyle.Secondary)
    );

    // Envia com imagem igual à da screenshot
    await canal.send({
        embeds: [embed],
        files: ["./banner.png"], // <- ESTA IMAGEM ESTÁ TE FALTANDO, JÁ VOU EXPLICAR
        components: [row]
    });

    console.log("✅ Painel enviado automaticamente!");
});

// Interações
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    // MOTIVO
    if (interaction.customId === "motivo") {
        await interaction.reply({
            ephemeral: true,
            embeds: [
                new EmbedBuilder()
                    .setColor("#2b2d31")
                    .setTitle(`${CONFIG.EMOJIS.ANUNCIO} Por que a verificação é necessária?`)
                    .setDescription(
                        "A verificação de captcha é uma medida de segurança essencial.\n\n" +
                        "Ela ajuda a proteger nosso servidor contra bots e selfbots maliciosos " +
                        "que enviam mensagens indesejadas ou tentam divulgar conteúdos no privado " +
                        "de nossos membros.\n\n" +
                        "Com essa verificação, garantimos que apenas pessoas reais tenham acesso, " +
                        "mantendo o ambiente seguro e agradável para todos."
                    )
            ]
        });
    }

    // VERIFICAR
    if (interaction.customId === "verificar") {
        const code = gerarCaptcha();
        captchas.set(interaction.user.id, code);

        const opcoes = gerarOpcoes(code);

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setImage("attachment://captcha.png")
            .setFooter({ text: "Selecione o texto que é exibido na imagem." });

        const menu = new StringSelectMenuBuilder()
            .setCustomId("escolher")
            .setPlaceholder("Selecione o texto que é exibido na imagem.")
            .addOptions(opcoes.map(o => ({ label: o, value: o })));

        await interaction.reply({
            ephemeral: true,
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(menu)],
            files: [{
                attachment: Buffer.from(`
██████╗ ███████╗███████╗███████╗██╗  ██╗███████╗██╗   ██╗ █████╗  ██████╗
██╔══██╗██╔════╝██╔════╝██╔════╝██║ ██╔╝██╔════╝██║   ██║██╔══██╗██╔════╝
██████╔╝█████╗  █████╗  █████╗  █████╔╝ █████╗  ██║   ██║███████║██║     
██╔══██╗██╔══╝  ██╔══╝  ██╔══╝  ██╔═██╗ ██╔══╝  ██║   ██║██╔══██║██║     
██║  ██║███████╗███████╗███████╗██║  ██╗███████╗╚██████╔╝██║  ██║╚██████╗
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝

${code}
                `),
                name: "captcha.png"
            }]
        });
    }

    // CAPTCHA
    if (interaction.customId === "escolher") {
        const correto = captchas.get(interaction.user.id);
        const escolhido = interaction.values[0];

        if (!correto) return interaction.update({
            ephemeral: true,
            content: "❌ Sessão expirada. Clique novamente em **Verificar-se**.",
            embeds: [],
            components: []
        });

        if (correto !== escolhido) {
            captchas.delete(interaction.user.id);
            return interaction.update({
                ephemeral: true,
                content: "❌ Código incorreto! Tente novamente.",
                embeds: [],
                components: []
            });
        }

        // Sucesso
        captchas.delete(interaction.user.id);
        await interaction.member.roles.add(CONFIG.VERIFIED_ROLE_ID);

        interaction.update({
            ephemeral: true,
            embeds: [
                new EmbedBuilder()
                    .setColor("#00ff88")
                    .setTitle(`${CONFIG.EMOJIS.VERIFICADO} Verificação concluída com sucesso!`)
                    .setDescription("*(editado)*")
            ],
            components: []
        });
    }
});

// Login
client.login(CONFIG.TOKEN);
