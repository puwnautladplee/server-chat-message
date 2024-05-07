// require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const GroupLists = require('./models/groupLists');
const chatMsgGroup = require('./models/messageGroup');
const APP_PORT = 5555;
app.get('/', (req, res) => {
    res.send('<h1>Forbidden</h1>');
});


server.listen(APP_PORT, () => {
    console.log(`App running on port ${APP_PORT}`);
});

const mongoose = require('mongoose');
console.log(process.env.DB_USERNAME);
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
mongoose.connect(uri).then(() => {
    console.log('connected')
}).catch(err => console.log(err))

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://chat-messages-puwnautladplees-projects.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});
let dataUsers = {};
let groupsChatUser = {};
app.get('/checkData', (req, res) => {
    res.send({
        dataUsers
    });
});
io.on('connection', function (socket) {
    socket.on('disconnect', () => {
        if (dataUsers[socket.id]) {
            socket.broadcast.to("chat-messages-channel").emit("update-status-user", dataUsers[socket.id].uid, 0);
            delete dataUsers[socket.id]
        }
    })
    socket.on('join-chat', (user) => {
        let key = Object.keys(dataUsers).find((key) => dataUsers[key]['uid'] === user.uid);
        if (key) {
            delete dataUsers[key];
        }
        dataUsers[socket.id] = user;
        socket.join("chat-messages-channel");
        socket.broadcast.to("chat-messages-channel").emit("update-status-user", dataUsers[socket.id].uid, 1);
    })
    socket.on('get-users', (callback) => {
        let dataCallback = Object.keys(dataUsers).map((key) => dataUsers[key]);
        callback(dataCallback);
    })
    socket.on('create-group-chat', (groupId, userdata, userLists) => {
        const _UTC_TIME = new Date().toUTCString();
        const _TIMESTAMP = Date.parse(_UTC_TIME);
        let groupName = [];
        let userhead = dataUsers[socket.id]
        let userheadGroup = {
            name: userhead?.name,
            datetime: _TIMESTAMP,
            uid: userhead?.uid ?? ""
        }
        groupName.push(userdata.name)
        const groupData = new GroupLists({
            group_id: groupId,
            group_name: `${groupName.join(',')}`,
            group_status: 1,
            datetime: _TIMESTAMP,
            users_list: [
                userheadGroup,
                {
                    name: userdata.name,
                    datetime: _TIMESTAMP,
                    uid: userdata?.uid ?? "",
                }
            ]
        });

        groupData.save().then(() => {
            groupsChatUser[groupId] = {}
            groupsChatUser[groupId][socket.id] = userhead
            let status = 0
            if (userdata.uid) {
                let keyUser = Object.keys(dataUsers).find((key) => { return dataUsers[key]['uid'] === userdata.uid });
                status = 1;
                groupsChatUser[groupId][keyUser] = dataUsers[keyUser]
            }
            if (groupsChatUser[groupId]) {
                for (id in groupsChatUser[groupId]) {
                    let dataUser = (socket.id === id ? userdata : userhead);
                    dataUser.group_id = groupData.group_id
                    dataUser.status = status
                    io.to(id).emit('join-group-chat', dataUser);
                }
            }
        })
    })

    socket.on('get-group-list', (filter, callback) => {
        if (filter) {
            GroupLists.find({ users_list: { $elemMatch: filter }, group_status: 1 }).sort({ 'datetime': 'desc' }).then(async (groupLists) => {
                if (groupLists.length) {
                    groupLists.map(async (g) => {
                        g.users_list = g.users_list.filter((u) => u.uid !== filter.uid);
                        if (!groupsChatUser[g.group_id]) {
                            groupsChatUser[g.group_id] = {}
                        }
                        g.users_list[0]['status'] = Object.keys(dataUsers).find((key) => dataUsers[key]["uid"] === g.users_list[0].uid) ? 1 : 0
                        groupsChatUser[g.group_id][socket.id] = dataUsers[socket.id]
                    })
                }
                callback(groupLists);
            })
        }
    });

    socket.on('get-chat-group-message', (groupData, callback) => {
        if (groupData && groupData.group_id) {
            chatMsgGroup.find({ groupId: groupData.group_id }).sort({ _id: -1 }).then(massages => {
                massages.reverse();
                callback(massages);
            })
        }
    });

    socket.on('chat-group-message', async (uid, dataChat, msg) => {

        const _UTC_TIME = new Date().toUTCString();
        const _TIMESTAMP = Date.parse(_UTC_TIME);
        const messageGroup = new chatMsgGroup({ groupId: dataChat.group_id, msg: msg, name: dataChat.name, datetime: _TIMESTAMP, uid: uid });
        messageGroup.save().then(async (massage) => {
            socket.emit('receive-chat-message', massage);
            let key = Object.keys(dataUsers).find((key) => dataUsers[key]['uid'] === dataChat.uid);
            io.to(key).emit('receive-chat-message', massage);
        })
    });
});

module.exports = app;
