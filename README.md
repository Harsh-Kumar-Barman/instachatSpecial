# update the conversation schema wtih this

```js
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
```

# add this controller and export it also

```js
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


## export👇👇👇

module.exports = {
    ...
    ...
    ...
    getRecentContacts
};
```


# update this code for the sendmessage for 1 to 1 chat

```js
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
```


# update this for create the group

```js
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
```

# update this controller for groupchatsendMessage
```js
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
```

#in main chat component just replace this code 

```js

  const getFollowingUsers = async (username) => {
    try {
      const userId = userDetails.id
      // const response = await axios.get(`/api/conversations/followingUsers/${username}`);
      const response = await axios.get(`/api/conversations/conversation/${userId}`);
      const followingUsers = [...response?.data]
      console.log(followingUsers)
      dispatch(setFollowingUsers(followingUsers))
      return response.data;
    } catch (error) {
      console.error('Error fetching following users:', error);
      if (error.response.statusText === "Unauthorized" || error.response?.status === 403) navigate('/login')

    }
  };



  const getRealTimeMessages = () => {
    socketRef.current.on('newMessage', (newMessage) => {
      console.log(newMessage)
      const senderId = newMessage.senderId._id;

      // Filter out the user from the array
      const filtered = convo.filter(user => user._id !== senderId);
      const objToMove = newMessage.senderId;
      objToMove.lastMessage = newMessage.lastMessage
      console.log(objToMove)
      console.log(objToMove)
      // Create a new array with the sender on top
      const followingUsers = [
        objToMove,
        ...filtered
      ];

      // Dispatch
      dispatch(setFollowingUsers(followingUsers));
      if (suggestedUser._id == newMessage.senderId._id) {

        Array.isArray(messages) ?
          dispatch(setMessages([...messages, newMessage])) : "no"
      }
    });
    socketRef.current.on('senderMessage', (newMessage) => {
      console.log(newMessage)
      const reciverId = newMessage.reciverId._id;

      // Filter out the user from the array
      const filtered = convo.filter(user => user._id !== reciverId);
      console.log(filtered)
      const objToMove = newMessage.reciverId;
      objToMove.lastMessage = newMessage.lastMessage
      const followingUsers = [
        objToMove,
        ...filtered
      ];

      // Dispatch
      dispatch(setFollowingUsers(followingUsers));

      Array.isArray(messages) ?
        dispatch(setMessages([...messages, newMessage])) : "no"
    });
    socketRef.current.on('sendGroupMessage', (newMessage) => {
      console.log(newMessage)
      const groupId = newMessage.groupId;

      // // Filter out the user from the array
      const filtered = convo.filter(user => user._id !== groupId);
      const objToMove = {
        lastMessage: { text: newMessage.message, createdAt: newMessage.timestamp },
        groupImage: "uploads/groupProfile.jpeg",
        groupName: newMessage.groupName,
        _id: groupId
      };
      const followingUsers = [
        objToMove,
        ...filtered
      ];

      // Dispatch
      dispatch(setFollowingUsers(followingUsers));
      Array.isArray(messages) ?
        dispatch(setMessages([...messages, newMessage])) : "no"
    });

  }

```