# 💚 Premium Dating App

A full-featured dating application with real-time messaging, premium memberships, and automatic payment processing with owner payouts.

## ✨ Features

### User Management
- User registration and login with JWT authentication
- Secure password hashing with bcrypt
- Detailed user profiles with photos, bio, interests, and preferences
- Age, gender, and relationship preference filters

### Messaging System
- Real-time chat with Socket.io
- Typing indicators and read receipts
- Conversation management
- Message history
- **Premium-only messaging** - Only premium members can send messages

### Premium Membership
Three subscription plans:
- **Monthly**: $9.99 (30 days) → Owner receives $7.99
- **Quarterly**: $24.99 (90 days) → Owner receives $19.99
- **Yearly**: $79.99 (365 days) → Owner receives $63.99

### Payment Processing ✅
- **Stripe Checkout** for secure payments
- **Stripe Connect** for automatic 80% owner payouts
- Payment verification and webhook handling
- Refund management
- Payment history tracking

### Admin Features
- Payment dashboard
- User verification
- Payout tracking
- Dispute handling

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB
- Stripe Account with Connect enabled
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/dating-app.git
cd dating-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your:
- MongoDB connection string
- JWT secret
- Stripe API keys
- Stripe Connect account ID
- Frontend URL

4. **Start the server**
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

The server will run on `http://localhost:5000`

## 📚 API Documentation

### Authentication Routes

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "age": 28,
  "gender": "male",
  "interestedIn": "female",
  "location": "New York"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Love hiking and coffee",
  "interests": ["hiking", "coffee", "travel"],
  "photos": ["url1", "url2"],
  "location": "New York"
}
```

### Payment Routes

#### Create Checkout Session
```http
POST /api/payments/create-checkout-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "planType": "monthly"  // or "quarterly" or "yearly"
}
```

Response:
```json
{
  "sessionId": "cs_...",
  "clientSecret": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Verify Payment
```http
POST /api/payments/verify-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "cs_..."
}
```

#### Check Premium Status
```http
GET /api/payments/premium-status
Authorization: Bearer <token>
```

Response:
```json
{
  "isPremium": true,
  "premiumExpiry": "2024-06-17T10:30:00Z",
  "daysRemaining": 31
}
```

#### Get Payment History
```http
GET /api/payments/history
Authorization: Bearer <token>
```

### Messaging Routes

#### Get or Create Conversation
```http
POST /api/messages/conversation/:receiverId
Authorization: Bearer <token>
```

#### Get Conversations List
```http
GET /api/messages/conversations
Authorization: Bearer <token>
```

#### Get Messages in Conversation
```http
GET /api/messages/conversation/:conversationId
Authorization: Bearer <token>
```

#### Send Message
```http
POST /api/messages/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "...",
  "receiverId": "...",
  "content": "Hey, how are you?"
}
```

#### Delete Conversation
```http
DELETE /api/messages/conversation/:conversationId
Authorization: Bearer <token>
```

#### Get Unread Messages Count
```http
GET /api/messages/unread-count
Authorization: Bearer <token>
```

## 🔌 Socket.IO Events

### Client → Server

**Join Conversation**
```javascript
socket.emit('join-conversation', conversationId, userId);
```

**Send Message**
```javascript
socket.emit('send-message', {
  conversationId,
  senderId,
  receiverId,
  content
});
```

**Typing Indicator**
```javascript
socket.emit('typing', conversationId, userId);
socket.emit('stop-typing', conversationId);
```

**Mark Message as Read**
```javascript
socket.emit('message-read', messageId);
```

### Server → Client

**New Message**
```javascript
socket.on('new-message', (message) => {
  // message contains: id, content, senderId, timestamp
});
```

**User Typing**
```javascript
socket.on('user-typing', ({ userId }) => {
  // Show typing indicator
});
```

**User Stop Typing**
```javascript
socket.on('user-stop-typing', () => {
  // Hide typing indicator
});
```

**Message Read**
```javascript
socket.on('message-read', (messageId) => {
  // Update message status
});
```

## 💰 Payment Flow

```
1. User selects premium plan
   ↓
2. Creates Stripe checkout session
   ↓
3. User completes payment
   ↓
4. Webhook verifies payment
   ↓
5. Update user premium status
   ↓
6. **AUTOMATIC: Transfer 80% to owner's Stripe Connect account**
   ↓
7. Remaining 20% stays in platform account
   ↓
8. User can now send/receive messages
```

## 🔐 Security Features

- JWT-based authentication
- Bcrypt password hashing
- HTTPS/TLS encryption
- Stripe PCI compliance
- CORS protection
- Input validation
- Rate limiting (recommended for production)
- SQL injection prevention

## 📊 Database Schema

### User
- firstName, lastName
- email, password
- profilePicture, photos
- bio, age, gender
- interestedIn, location, interests
- isPremium, premiumExpiry
- stripeCustomerId

### Message
- conversationId, senderId, receiverId
- content, image
- isRead, readAt
- createdAt

### Conversation
- participants (array of user IDs)
- lastMessage, lastMessageAt
- isActive

### Payment
- userId, stripePaymentIntentId
- planType, amount, currency
- status, paymentMethod
- payoutAmount, payoutStatus, stripePayoutId
- premiumStartDate, premiumEndDate
- receipt, metadata

## 🛠️ Development

### Project Structure
```
dating-app/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── models/
│   ├── User.js
│   ├── Message.js
│   ├── Conversation.js
│   └── Payment.js
├── routes/
│   ├── auth.js
│   ├── payments.js
│   └── messages.js
└── README.md
```

### Running Tests
```bash
npm test
```

### Environment Setup
1. Create a `.env` file based on `.env.example`
2. Set up Stripe account and enable Connect
3. Set up MongoDB cluster
4. Configure webhook in Stripe dashboard to `http://yourdomain.com/api/payments/webhook`

## 🚨 Important Notes

### Stripe Setup
1. Enable Stripe Connect on your Stripe account
2. Get your **Stripe Account ID** (acct_...)
3. Set `OWNER_STRIPE_ACCOUNT` to your Stripe Connect account
4. Configure webhooks for payment events

### Payout Percentage
- Currently set to **80% to owner, 20% for platform**
- Modify in `routes/payments.js` if needed
- Change `PAYOUT_PERCENTAGE` in `.env`

### Production Checklist
- [ ] Use HTTPS
- [ ] Enable rate limiting
- [ ] Set up error logging
- [ ] Configure monitoring/alerts
- [ ] Enable 2FA on admin accounts
- [ ] Set up backup strategy
- [ ] Configure CDN for images
- [ ] Enable database encryption
- [ ] Set up payment dispute handling

## 📞 Support & Issues

For issues or questions:
1. Check the documentation
2. Review Stripe documentation
3. Check MongoDB Atlas documentation
4. Create an issue on GitHub

## 📝 License

MIT License - feel free to use this project for commercial purposes

## 🎉 Enjoy Your Dating App!

This app is ready for deployment. Start earning with automatic payouts! 💰

---

**Made with ❤️ for connecting people**
