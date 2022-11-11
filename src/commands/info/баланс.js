const { Client, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Qiwi = require("@qiwi/bill-payments-node-js-sdk");
module.exports = {
    slash: new SlashCommandBuilder()
        .setName('баланс')
        .setDescription("Посмотреть свой баланс"),
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true })

        const data = await client.db.user.findOne({ userId: interaction.user.id});
        await interaction.editReply({ content: `**Ваш баланс:** ${data?.balance || 0}` })
    }
}