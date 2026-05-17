const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET OR CREATE CONVERSATION
 * POST /api/messages/conversation/:receiverId
 */
router.post('/conversation/:receiverId', auth, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const userId = req.userId;

    // Check if users exist
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, receiverId] }
    });

    // Create if doesn't exist
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, receiverId]
      });
      await conversation.save();
    }

    res.json({
      success: true,
      conversationId: conversation._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET CONVERSATIONS LIST
 * GET /api/messages/conversations
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      isActive: true
    })
      .populate('participants', 'firstName lastName profilePicture')
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET MESSAGES IN CONVERSATION
 * GET /api/messages/conversation/:conversationId
 */
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId,
      deletedAt: null
    })
      .populate('senderId', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversationId,
      deletedAt: null
    });

    res.json({
      success: true,
      messages: messages.reverse(),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * SEND MESSAGE
 * POST /api/messages/send
 * Premium users only
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;

    // Check premium status
    const sender = await User.findById(req.userId);
    if (!sender.isPremium || sender.premiumExpiry < new Date()) {
      return res.status(403).json({ error: 'Premium membership required to send messages' });
    }

    if (!content || !conversationId || !receiverId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId: req.userId,
      receiverId,
      content
    });

    await message.save();

    // Update conversation
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: content,
        lastMessageAt: new Date(),
        lastMessageBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * MARK MESSAGE AS READ
 * PUT /api/messages/:messageId/read
 */
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE CONVERSATION
 * DELETE /api/messages/conversation/:conversationId
 */
router.delete('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { isActive: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET UNREAD MESSAGES COUNT
 * GET /api/messages/unread-count
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Message.countDocuments({
      receiverId: req.userId,
      isRead: false,
      deletedAt: null
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
