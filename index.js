import { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// EMOJIS
const EMOJI_LOCK = "<:locked:1441125870453657620>";
const EMOJI_BOT = "<:bot:1439906396886925352>";
const EMOJI_INFO = "<:anuncio:1439906320991125575>";
const EMOJI_CHECK = "<:verificado:1439616052115017900>";

// CÓDIGOS & IMAGENS
const codes = {
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

// Função para enviar o painel ao iniciar
async function sendVerificationPanel() {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    if (!channel) return console.log("CANAL NÃO ENCONTRADO!");

    const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`${EMOJI_LOCK} Verificação`)
        .setDescription(
            `${EMOJI_INFO} **Por que a verificação é necessária?**\n` +
            "Para garantir que você não é um bot e manter o servidor seguro."
        )
        .setImage("https://i.imgur.com/D031fg5.png")
        .setFooter({ text: "Clique no botão abaixo para iniciar a verificação." });

    const button = new ButtonBuilder()
        .setCustomId("start_verification")
        .setLabel("Verificar")
        .setEmoji("1439906396886925352")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });
}

// Bot pronto
client.once("clientReady", () => {
    console.log("BOT ONLINE ✔️");
    sendVerificationPanel(); // Envia painel ao iniciar
});

// Click no botão
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "start_verification") {
        const allCodes = Object.keys(codes);

        const correctCode = allCodes[Math.floor(Math.random() * allCodes.length)];
        const correctImage = codes[correctCode];

        const options = shuffle([
            correctCode,
            ...pickRandomExcept(allCodes, correctCode, 4)
        ]).map(code => ({
            label: code,
            value: code
        }));

        const embed = new EmbedBuilder()
            .setColor("#1e1f22")
            .setImage(correctImage);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`verify_${correctCode}`)
            .setPlaceholder("Selecione o texto que é exibido na imagem.")
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
});

// Dropdown selecionado
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const correctCode = interaction.customId.replace("verify_", "");

    if (interaction.values[0] === correctCode) {
        return interaction.reply({
            content: `${EMOJI_CHECK} **Verificado com sucesso!**`,
            ephemeral: true
        });
    } else {
        return interaction.reply({
            content: "❌ Código incorreto. Tente novamente!",
            ephemeral: true
        });
    }
});

// Funções auxiliares
function pickRandomExcept(list, except, count) {
    const filtered = list.filter(x => x !== except);
    return shuffle(filtered).slice(0, count);
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

client.login(process.env.TOKEN);

