const { Client, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Qiwi = require("@qiwi/bill-payments-node-js-sdk");
module.exports = {
    slash: new SlashCommandBuilder()
        .setName('пополнить')
        .setDescription("Оплатить счет").addNumberOption(option => option.setName("сумма").setDescription("Поддержать автора").setRequired(true)).addStringOption(option => option.setName("комментарий").setDescription(`Комментарий к переводу`).setMaxLength(48)),
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true })

        const row = new ActionRowBuilder().addComponents([new ButtonBuilder().setLabel(`Проверить`).setStyle(ButtonStyle.Success).setCustomId("test"), new ButtonBuilder().setCustomId("cancel").setLabel(`Отменить`).setStyle(ButtonStyle.Danger)])

        const qiwiApi = new Qiwi(client.qiwi.secret);
        const qiwiSettings = {
            amount: interaction.options.getNumber("сумма"),
            billId: "0",
            comment: interaction.options.getString("комментарий") || "пополнение баланса",
            currency: "RUB",
            expirationDateTime: qiwiApi.getLifetimeByDay(0.04),
        };
        qiwiSettings.billId = qiwiApi.generateId();
        qiwiApi.createBill(qiwiSettings.billId, qiwiSettings).then(async (data) => {
            const reply = await interaction.editReply({ content: `Оплата на **сумму** — ${qiwiSettings.amount}\n\n**Ссылка для оплаты:** ${data.payUrl}`, components: [row] });
            const collector = reply.createMessageComponentCollector();
            collector.on("collect", async i => {
                await i.deferUpdate().catch(() => null);
                if (i.customId === "test") {
                    qiwiApi.getBillInfo(qiwiSettings.billId).then(async data => {
                        if (data.status.value === "PAID") {
                            await i.followUp({ content: `> Оплата прошла **успешно**!\n\nВаш баланс пополнен на ${interaction.options.getNumber("сумма")}`, ephemeral: true });
                            await client.db.user.updateOne({ userid: interaction.user.id }, {
                                $inc: {
                                    "balance": interaction.options.getNumber("сумма")
                                }
                            })
                            row.components[0].setDisabled(true);
                            row.components[1].setDisabled(true);
                            await interaction.editReply({ content: `Оплата на **сумму** — ${qiwiSettings.amount}\n\n**Ссылка для оплаты:** Оплачено`, components: [row] });
                            collector.stop();
                        } else {
                            await i.followUp({ content: `> Вы **не оплатили** счет!`, ephemeral: true })
                        }
                    })
                }
                if (i.customId === "cancel") {
                    qiwiApi.cancelBill(qiwiSettings.billId).then(async (data) => {
                        await i.followUp({ content: `> Счет **успешно** отменён!`, ephemeral: true });
                        collector.stop();
                        interaction.editReply({ content: `Оплата на **сумму** — ${qiwiSettings.amount}\n\n**Ссылка для оплаты:** счет был **отменён**`, components: [] })
                    })
                }
            })
        })
    }
}