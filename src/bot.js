const { Client, Partials, Collection } = require("discord.js");
const User = require("./models/User");
const keys = require("../qiwi.json")

require("dotenv").config();
require("colors");
const client = new Client({
    intents: 14023,
    partials: [Partials.User, Partials.Message, Partials.GuildMember, Partials.Channel],
    allowedMentions: { repliedUser: false },
});
client.commands_array = [];
client.commands = new Collection();
client.colors = { default: 16777215 };
client.emoji = { success: "✅", danger: "⚠", error: "❌" };
client.qiwi = { secret: process.env.secret, public: process.env.public };
client.db = { user: User, guild: Guild };

require("./handlers/eventHandler").init(client);

client.login(process.env.token).then(console.log(`[APP]: `.green.bold + `The application has been successfully downloaded!`.blue.bold));

module.exports = client;