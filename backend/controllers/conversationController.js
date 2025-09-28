const Conversation = require('../models/conversationSchema');
const Message = require('../models/messageSchema');
const User = require('../models/userSchema');
const GroupChat = require('../models/groupChatSchema')
const cloudinary = require('../config/cloudinary')
const { getReciverSocketId, io } = require('../socket/socket');
const groupChatSchema = require('../models/groupChatSchema');

// For individual message sending
const sendMessage = async (req, res) => {
  try {
    const { textMessage: message, senderId, messageType } = req.body;
    const receiverId = req.params.id;

    // Handle file upload (if exists)
    let mediaUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "auto",  // Automatically detects image or video
      });
      mediaUrl = result.secure_url;
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    const newMessage = await Message.create({
      senderId,
      reciverId: receiverId,
      message: messageType === 'text' ? message : undefined,
      mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
      messageType,
    });
    conversation.messages.push(newMessage._id);
    conversation.lastMessage = {
      messageId: newMessage._id,
      text: messageType === 'text' ? message : `[${messageType}]`,
      senderId,
      createdAt: newMessage.createdAt,
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // Populate the new message with sender and receiver details
    const popMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username profilePicture') // Populate sender details
      .populate('reciverId', 'username profilePicture'); // Populate receiver details
    const populatedMessage = popMessage.toObject();
    populatedMessage.lastMessage = {
      text: newMessage.message,
      createdAt: newMessage.timestamp // use createdAt instead of timestamp
    };
    // console.log("populatedMessage  ", populatedMessage)
    const receiverSocketId = getReciverSocketId(receiverId);
    const senderSocketId = getReciverSocketId(senderId)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', populatedMessage);
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit('senderMessage', populatedMessage);
    }



    res.status(200).json({ success: true, newMessage: populatedMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// const sendMessage = async (req, res) => {
//   try {
//     const { textMessage: message, senderId, messageType } = req.body;
//     const receiverId = req.params.id;

//     // Handle file upload (if exists)
//     let mediaUrl = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(req.file.path, {
//         resource_type: "auto", // auto-detect image/video
//       });
//       mediaUrl = result.secure_url;
//     }

//     // Find or create conversation
//     let conversation = await Conversation.findOne({
//       participants: { $all: [senderId, receiverId] }
//     });

//     if (!conversation) {
//       conversation = await Conversation.create({
//         participants: [senderId, receiverId],
//         messages: [] // ensure array exists
//       });
//     }

//     // Create new message
//     const newMessage = await Message.create({
//       senderId,
//       reciverId: receiverId,
//       message: messageType === 'text' ? message : undefined,
//       mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
//       messageType,
//     });

//     // ✅ Add to messages + update lastMessage
//     conversation.messages.push(newMessage._id);
//     conversation.lastMessage = {
//       messageId: newMessage._id,
//       text: messageType === 'text' ? message : `[${messageType}]`,
//       senderId,
//       createdAt: newMessage.createdAt,
//     };
//     conversation.updatedAt = new Date();
//     await conversation.save();

//     // ✅ Populate the newly saved message for response
//     const populatedMessage = await Message.findById(newMessage._id)
//       .populate('senderId', 'username fullName profilePicture')
//       .populate('reciverId', 'username fullName profilePicture');

//     // ✅ Also populate lastMessage inside conversation for frontend
//     const populatedConversation = await Conversation.findById(conversation._id)
//       .populate('participants', 'username fullName profilePicture')
//       .populate('lastMessage.senderId', 'username fullName profilePicture');

//     // 🔔 Emit socket events
//     const receiverSocketId = getReciverSocketId(receiverId);
//     const senderSocketId = getReciverSocketId(senderId);

//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit('newMessage', populatedMessage);
//     }

//     if (senderSocketId) {
//       io.to(senderSocketId).emit('senderMessage', populatedMessage);
//     }

//     // Send back both message + updated conversation
//     res.status(200).json({
//       success: true,
//       message: populatedMessage,
//       conversation: populatedConversation
//     });

//   } catch (error) {
//     console.log("SendMessage Error:", error.message);
//     res.status(500).json({ error: 'Server error' });
//   }
// };


// For getting friends of a user


const getFriends = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .populate({
        path: 'following',
        select: '-password'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.following);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const senderId = req.query.senderId;
    const receiverId = req.params.id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }).populate({
      path: 'messages',
      populate: [
        { path: 'senderId', select: 'username profilePicture' }, // Populate sender details
        { path: 'reciverId', select: 'username profilePicture' }  // Populate receiver details (if necessary)
      ]
    });


    if (!conversation) {
      return res.status(201).json({ success: true, messages: [] });
    }

    return res.status(200).json({ success: true, messages: conversation.messages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};


// const createGroupChat = async (req, res) => {
//   try {
//     const { groupName, members, groupImage, createdBy } = req.body;

//     // Create the group chat
//     const allMembers = [...members, { userId: createdBy, role: 'admin' }];

//     const newGroupChat = await GroupChat.create({
//       groupName,
//       groupImage,
//       members: allMembers,
//       createdBy
//     });



//     allMembers.forEach(({ userId }) => {
//       // Get the socket ID for this user
//       const socketId = getReciverSocketId(userId);
//       if (socketId) {
//         // Emit a message to the specific user by their socket ID
//         io.to(socketId).emit('groupCreated', {
//           message: `You have been added to the group ${groupName}`,
//           groupChat: newGroupChat
//         });
//       }
//     });

//     res.status(201).json({ success: true, groupChat: newGroupChat });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: 'Server error' });
//   }
// };


const createGroupChat = async (req, res) => {
  try {
    const { groupName, members, groupImage, createdBy } = req.body;

    // Add the admin to members
    const allMembers = [...members, { userId: createdBy, role: 'admin' }];

    // Create the group chat
    const newGroupChat = await GroupChat.create({
      groupName,
      groupImage,
      members: allMembers,
      createdBy
    });

    // Create a conversation document for the group
    const newConversation = await Conversation.create({
      participants: allMembers.map(m => m.userId),
      group: newGroupChat._id,
      messages: [],
      lastMessage: null
    });

    // Emit socket to all members
    allMembers.forEach(({ userId }) => {
      const socketId = getReciverSocketId(userId);
      if (socketId) {
        io.to(socketId).emit('groupCreated', {
          message: `You have been added to the group ${groupName}`,
          groupChat: newGroupChat
        });
      }
    });

    res.status(201).json({
      success: true,
      groupChat: newGroupChat,
      conversation: newConversation
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};



const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    const groups = await GroupChat.find({
      $or: [
        { "members.userId": userId }, // User is a member
        { createdBy: userId }         // User is the creator/admin
      ]
    }).populate({
      path: 'members.userId',
      select: 'fullName username' // Include fullName and username, exclude password
    }); // Exclude password field

    if (!groups) return res.status(401).json({ message: "not in any group" });


    res.status(200).json(groups);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// For send messages in the group
// const sendGroupMessage = async (req, res) => {
//   try {
//     const { senderId, textMessage: message, messageType } = req.body;
//     const groupId = req.params.groupId;

//     let mediaUrl = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(req.file.path, {
//         resource_type: "auto",
//       });
//       mediaUrl = result.secure_url;
//     }

//     const groupChat = await GroupChat.findById(groupId);
//     if (!groupChat) {
//       return res.status(404).json({ error: 'Group chat not found' });
//     }

//     const newMessage = {
//       senderId,
//       message: messageType === 'text' ? message : undefined,
//       mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
//       messageType,
//     };

//     groupChat.messages.push(newMessage);
//     groupChat.updatedAt = Date.now();

//     await groupChat.save();

//     // Emit the new message to all group members via socket.io
//     const members = groupChat.members.map(member => member.userId.toString());
//     members.forEach(memberId => {
//       const memberSocketId = getReciverSocketId(memberId);
//       if (memberSocketId) {
//         io.to(memberSocketId).emit('sendGroupMessage', newMessage);
//       }
//     });

//     res.status(201).json({ success: true, newMessage });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// const sendGroupMessage = async (req, res) => {
//   try {
//     const { senderId, textMessage: message, messageType } = req.body;
//     const groupId = req.params.groupId;
// console.log(senderId, message, messageType, groupId)

//     let mediaUrl = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(req.file.path, {
//         resource_type: "auto", // detect image/video automatically
//       });
//       mediaUrl = result.secure_url;
//     }

//     // Find the group chat
//     const groupChat = await GroupChat.findById(groupId);
//     if (!groupChat) {
//       return res.status(404).json({ error: 'Group chat not found' });
//     }

//     // Create message object
//     const newMessage = {
//       senderId,
//       message: messageType === 'text' ? message : undefined,
//       mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
//       messageType
//     };

//     // Save message in group chat
//     groupChat.messages.push(newMessage);
//     groupChat.updatedAt = Date.now();
//     await groupChat.save();

//     // Update conversation with lastMessage
//     const conversation = await Conversation.findOne({ group: groupId });
//     conversation.messages.push(newMessage);
//     conversation.lastMessage = {
//       messageId: newMessage._id,
//       text: messageType === 'text' ? message : `[${messageType}]`,
//       senderId,
//       createdAt: new Date()
//     };
//     conversation.updatedAt = new Date();
//     await conversation.save();

//     // Emit the message to all members via socket.io
//     const members = groupChat.members.map(m => m.userId.toString());
//     members.forEach(memberId => {
//       const socketId = getReciverSocketId(memberId);
//       if (socketId) io.to(socketId).emit('sendGroupMessage', newMessage);
//     });

//     res.status(201).json({ success: true, newMessage });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: 'Server error' });
//   }
// };


const sendGroupMessage = async (req, res) => {
  try {
    const { senderId, textMessage: message, messageType } = req.body;
    const groupId = req.params.groupId;

    let mediaUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });
      mediaUrl = result.secure_url;
    }

    const groupRes = await groupChatSchema.findById(groupId)

    // Save message in Message collection
    const newMessage = await Message.create({
      senderId,
      groupId,
      message: messageType === 'text' ? message : undefined,
      mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
      messageType
    });

    // Update Conversation
    const conversation = await Conversation.findOne({ group: groupId });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = {
      messageId: newMessage._id,
      text: messageType === 'text' ? message : `[${messageType}]`,
      senderId,
      createdAt: newMessage.timestamp
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // Update GroupChat embedded messages
    const groupChat = await GroupChat.findById(groupId);
    groupChat.messages.push({
      senderId,
      message: messageType === 'text' ? message : undefined,
      mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
      messageType,
      timestamp: newMessage.timestamp
    });
    groupChat.updatedAt = new Date();
    await groupChat.save();

    const newMsg = newMessage.toObject()
    newMsg.groupName = groupRes.groupName
    newMsg.groupImage = groupRes.groupImage
    console.log(newMsg)

    // Emit message to all group members
    groupChat.members.forEach(m => {
      const socketId = getReciverSocketId(m.userId.toString());
      if (socketId) io.to(socketId).emit('sendGroupMessage', newMsg);
    });
    res.status(201).json({ success: true, newMessage });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};



// Get all messages from a group chat
const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const groupChat = await GroupChat.findById(groupId).populate('messages.senderId', 'username profilePicture');
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    res.status(200).json({ success: true, messages: groupChat.messages });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add a member to the group chat
const addMemberToGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { userId } = req.body;

    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    // Check if the user is already in the group
    const isMember = groupChat.members.some(member => member.userId.toString() === userId);
    if (isMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    groupChat.members.push({ userId });
    await groupChat.save();

    res.status(200).json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove a member from the group chat
const removeMemberFromGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { userId } = req.body;

    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    groupChat.members = groupChat.members.filter(member => member.userId.toString() !== userId);
    await groupChat.save();

    res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// const getRecentContacts = async (req, res) => {
//   //     try {
//   //         const {userId} = req.params;

//   //         // Find all conversations where the user is a participant
//   //         const conversations = await Conversation.find({
//   //             participants: userId
//   //         })
//   //         .populate('participants', '_id username profilePicture')
//   //         .sort({ updatedAt: -1 }); // most recent conversation first
//   // console.log(conversations)
//   //         // Collect other participants in order
//   //         const contactsMap = new Map();

//   //         conversations.forEach(conv => {
//   //             conv.participants.forEach(p => {
//   //                 if (p._id.toString() !== userId) {
//   //                     // overwrite if already exists to ensure latest conversation wins
//   //                     contactsMap.set(p._id.toString(), p);
//   //                 }
//   //             });
//   //         });

//   //         const contacts = Array.from(contactsMap.values());

//   //         res.status(200).json(contacts);

//   //     } catch (err) {
//   //         console.error(err);
//   //         res.status(500).json({ error: 'Server error' });
//   //     }

//   try {
//     const { userId } = req.params; // logged in user id
//     console.log(userId)
//     // Find conversations where user is a participant
//     const conversations = await Conversation.find({
//       participants: userId
//     })
//       .populate({
//         path: 'participants',
//         select: 'username fullName profilePicture',
//       })
//       .populate({
//         path: 'messages',
//         options: { sort: { createdAt: -1 }, limit: 1 }, // only latest message
//         populate: {
//           path: 'senderId',
//           select: 'username fullName profilePicture'
//         }
//       })
//       .sort({ updatedAt: -1 }); // order by last activity
//     // Format clean response
//     const result = conversations.map(conv => {
//       // Get the other user (not the logged-in one)
//       const otherUser = conv.participants.find(
//         p => p._id.toString() !== userId
//       );
//       // console.log(conv.messages)

//       // const latestMessage = conv.messages[0];
//       const latestMessage = conv.lastMessage
//       console.log("lastmg  ", latestMessage)

//       return {
//         _id: otherUser?._id,
//         username: otherUser?.username,
//         name: otherUser?.fullName,
//         profilePicture: otherUser?.profilePicture,
//         lastMessage: latestMessage
//           ? {
//             // messageId: latestMessage._id,
//             text: latestMessage.text,   // plain text
//             createdAt: conv.updatedAt
//             // senderId: latestMessage.senderId, 
//           }
//           : null,
//         // lastMessage: latestMessage
//         //   ? (latestMessage.messageType === 'text'
//         //     ? latestMessage.message
//         //     : `[${latestMessage.messageType}]`)
//         //   : null,
//         time: latestMessage ? latestMessage.createdAt : conv.updatedAt
//       };
//     });
// console.log("result  ",result)
//     res.status(200).json(result);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// }

const getRecentContacts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate({
        path: 'participants',
        select: 'username fullName profilePicture',
      })
      .populate({
        path: 'group',
        select: 'groupName groupImage members',
        populate: { path: 'members.userId', select: 'username fullName profilePicture' }
      })
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 }, limit: 1 }, // latest message
        populate: {
          path: 'senderId',
          select: 'username fullName profilePicture'
        }
      })
      .sort({ updatedAt: -1 }); // sort by last activity

    const result = conversations.map(conv => {
      const latestMessage = conv.lastMessage;

      // Check if it's a group conversation
      if (conv.group) {
        return {
          _id: conv.group._id,
          groupName: conv.group.groupName,
          groupImage: conv.group.groupImage,
          members: conv.group.members.map(m => ({
            _id: m.userId._id,
            username: m.userId.username,
            fullName: m.userId.fullName,
            profilePicture: m.userId.profilePicture,
            role: m.role
          })),
          lastMessage: latestMessage
            ? {
              text: latestMessage.text,
              createdAt: latestMessage.createdAt || conv.updatedAt
            }
            : null,
          time: latestMessage ? latestMessage.createdAt : conv.updatedAt
        };
      } else {
        // 1-on-1 conversation
        const otherUser = conv.participants.find(p => p._id.toString() !== userId);
        return {
          _id: otherUser?._id,
          username: otherUser?.username,
          name: otherUser?.fullName,
          profilePicture: otherUser?.profilePicture,
          lastMessage: latestMessage
            ? {
              text: latestMessage.text,
              createdAt: latestMessage.createdAt || conv.updatedAt
            }
            : null,
          time: latestMessage ? latestMessage.createdAt : conv.updatedAt
        };
      }
    });
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getFriends,
  getAllMessages,
  createGroupChat,
  sendGroupMessage,
  getGroupMessages,
  addMemberToGroup,
  removeMemberFromGroup,
  getUserGroups,
  getRecentContacts
};