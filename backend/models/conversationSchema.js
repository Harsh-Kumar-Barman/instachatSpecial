// // const mongoose = require('mongoose');


// // const conversationSchema = mongoose.Schema({
// //     participants: [{
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref: 'User'
// //     }],
// //      messages: [{
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref:'Message'
// //     }],

// // }, { timestamps: true })

// // module.exports = mongoose.model('Conversation', conversationSchema);



// const mongoose = require('mongoose');


// const conversationSchema = mongoose.Schema({
//     participants: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     }],
//     messages: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Message'
//     }],
//     lastMessage: {
//         messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
//         text: String,
//         senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//         createdAt: Date
//     }

// }, { timestamps: true })

// module.exports = mongoose.model('Conversation', conversationSchema);

const mongoose = require('mongoose');


const conversationSchema = mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupChat', default: null },
  lastMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    text: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
