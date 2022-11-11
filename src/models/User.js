const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    userId: String,
    balance: { type: Number, default: 0 }
})

module.exports = mongoose.model('user', userSchema);