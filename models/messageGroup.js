const mongoose = require('mongoose');
const msgGroupSchema = new mongoose.Schema({
    msg: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    groupId: {
        type: String,
        required: true
    },
    datetime: {
        type: String,
        required: true
    },
    uid: {
        type: String,
        required: false
    }
})

const chatGroup = mongoose.model("chat-group", msgGroupSchema);

module.exports = chatGroup;