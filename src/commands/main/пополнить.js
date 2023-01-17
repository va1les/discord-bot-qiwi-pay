const { Client, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Qiwi = require("@qiwi/bill-payments-node-js-sdk");
module.exports = {
    slash: new SlashCommandBuilder()
        .setName('перевод')
        .setDescription("перевод физ. лицу").addNumberOption(option => option.setName("сумма").setDescription("сумма перевода").setRequired(true)).addStringOption(option => option.setName("комментарий").setDescription(`добрый комментарий к переводу`).setMaxLength(48)),
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true })

        const row = new ActionRowBuilder().addComponents([new ButtonBuilder().setEmoji(client.emoji.success).setStyle(ButtonStyle.Secondary).setCustomId("test"), new ButtonBuilder().setCustomId("cancel").setEmoji(client.emoji.error).setStyle(ButtonStyle.Secondary)])

        const qiwiApi = new Qiwi(client.qiwi.secret);
        const qiwiSettings = {
            amount: interaction.options.getNumber("сумма"),
            billId: "0",
            comment: interaction.options.getString("комментарий") || `${interaction.user.tag}: ${interaction.options.getNumber("сумма")}₽`,
            currency: "RUB",
            expirationDateTime: qiwiApi.getLifetimeByDay(0.04), // счет на 1 час
        };
        qiwiSettings.billId = qiwiApi.generateId();
        qiwiApi.createBill(qiwiSettings.billId, qiwiSettings).then(async (data) => {
            const reply = await interaction.editReply({
                embeds: [
                    new EmbedBuilder().setAuthor({ name: `Перевод: ${qiwiSettings.amount}₽`, iconURL: interaction.user.displayAvatarURL() })
                        .setColor(client.colors.default)
                        .setDescription(`**Ссылка на оплату: [Кликабельно](${data.payUrl})**.${interaction.options.getString("комментарий") !== null ? `\n**Комментарий:** ${interaction.options.getString("комментарий")}` : ""}\n\n${client.emoji.success} — проверить перевод\n${client.emoji.error} — отменить перевод`)
                ], components: [row]
            });
            const collector = reply.createMessageComponentCollector();
            collector.on("collect", async i => {
                await i.deferUpdate().catch(() => null);
                if (i.customId === "test") {
                    qiwiApi.getBillInfo(qiwiSettings.billId).then(async data => {
                        if (data.status.value === "PAID") {
                            await i.followUp({ content: `${client.emoji.success} **${interaction.user.tag}**, перевод проведён успешно.`, ephemeral: true });
                            row.components[0].setDisabled(true);
                            row.components[1].setDisabled(true);
                            await interaction.editReply({
                                embeds: [
                                    new EmbedBuilder().setAuthor({ name: `Перевод: ${qiwiSettings.amount}₽`, iconURL: interaction.user.displayAvatarURL() })
                                        .setColor(client.colors.default)
                                        .setDescription(`**Ссылка на оплату: [Оплачено](${data.payUrl})**.`)
                                ], components: [row]
                            });
                            collector.stop();
                        } else {
                            await i.followUp({ content: `${client.emoji.error} **${interaction.user.tag}**, перевод не оплачен.`, ephemeral: true })
                        }
                    })
                }
                if (i.customId === "cancel") {
                    qiwiApi.cancelBill(qiwiSettings.billId).then(async (data) => {
                        await interaction.editReply({ embeds: [], components: [], content: `${client.emoji.success} **${interaction.user.tag}**, перевод успешно отменён.` });
                        await i.followUp({ content: `${client.emoji.success} **${interaction.user.tag}**, вы успешно отменили перевод.`, ephemeral: true });
                        collector.stop();
                    })
                }
            })
        })
    }
}