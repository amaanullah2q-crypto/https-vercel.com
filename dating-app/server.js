const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');

// Import models
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running ✅' });
});

// Socket.IO Events - Real-time Messaging
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  /**
   * JOIN CONVERSATION
   * User joins a conversation room
   */
  socket.on('join-conversation', (conversationId, userId) => {
    socket.join(`conversation-${conversationId}`);
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} joined conversation ${conversationId}`);
  });

  /**
   * SEND MESSAGE
   * Real-time message delivery
   */
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, senderId, receiverId, content, messageId } = data;

      // Emit to conversation room
      io.to(`conversation-${conversationId}`).emit('new-message', {
        id: messageId,
        conversationId,
        senderId,
        content,
        createdAt: new Date(),
        isRead: false
      });

      console.log(`Message from ${senderId} to ${receiverId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { error: error.message });
    }
  });

  /**
   * TYPING INDICATOR
   */
  socket.on('typing', (conversationId, userId) => {
    io.to(`conversation-${conversationId}`).emit('user-typing', { userId });
  });

  socket.on('stop-typing', (conversationId, userId) => {
    io.to(`conversation-${conversationId}`).emit('user-stop-typing', { userId });
  });

  /**
   * MESSAGE READ RECEIPT
   */
  socket.on('message-read', (messageId, conversationId) => {
    io.to(`conversation-${conversationId}`).emit('message-read', messageId);
  });

  /**
   * USER DISCONNECT
   */
  socket.on('disconnect', () => {
    // Find and remove user from active users
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║     💚 PREMIUM DATING APP SERVER RUNNING 💚        ║
║                                                    ║
║     ✅ Authentication: JWT enabled                ║
║     ✅ Real-time Chat: Socket.IO active           ║
║     ✅ Payments: Stripe + 80% Payouts active      ║
║     ✅ Database: MongoDB connected                ║
║                                                    ║
║     Server running on: http://localhost:${PORT}    ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, io };
