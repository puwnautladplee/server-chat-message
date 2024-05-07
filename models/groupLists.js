const mongoose = require('mongoose');
const usersList = new mongoose.Schema({
    name: {
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
    },
    status: {
        type: Number,
    },
});
const groupListsSchema = new mongoose.Schema({
    group_id: {
        type: String,
        required: true
    },
    group_name: {
        type: String,
        required: true
    },
    group_status: {
        type: Number,
        required: true
    },
    datetime: {
        type: String,
        required: true
    },
    users_list: {
        type: [usersList],
        required: true
    }
})

const groupLists = mongoose.model("groupslist", groupListsSchema);

module.exports = groupLists;