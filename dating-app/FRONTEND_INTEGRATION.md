# 💚 Dating App - Frontend Integration Guide

This guide explains how to integrate the Dating App frontend with the backend API.

## 🔌 API Base URL

```
http://localhost:5000/api
```

## 📝 Authentication

All endpoints (except registration and login) require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🚀 Frontend Setup

### 1. Install Dependencies

```bash
npm install axios socket.io-client
```

### 2. Create API Client

```javascript
// src/api/client.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
```

### 3. Authentication Flow

#### Register

```javascript
// src/pages/Register.js
import client from '../api/client';

async function handleRegister(formData) {
  try {
    const response = await client.post('/auth/register', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      age: formData.age,
      gender: formData.gender,
      interestedIn: formData.interestedIn,
      location: formData.location
    });

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    // Redirect to home/discover page
    window.location.href = '/discover';
  } catch (error) {
    console.error('Registration failed:', error.response.data);
  }
}
```

#### Login

```javascript
async function handleLogin(email, password) {
  try {
    const response = await client.post('/auth/login', { email, password });
    
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    window.location.href = '/discover';
  } catch (error) {
    console.error('Login failed:', error.response.data);
  }
}
```

### 4. Payment Integration

#### Create Checkout Session

```javascript
// src/pages/Premium.js
import client from '../api/client';
import { loadStripe } from '@stripe/js';

const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

async function handleSubscribe(planType) {
  try {
    // Create checkout session
    const response = await client.post('/payments/create-checkout-session', {
      planType: planType // 'monthly', 'quarterly', or 'yearly'
    });

    // Redirect to Stripe checkout
    const result = await stripe.redirectToCheckout({
      sessionId: response.data.sessionId
    });

    if (result.error) {
      console.error('Stripe error:', result.error.message);
    }
  } catch (error) {
    console.error('Checkout failed:', error.response.data);
  }
}
```

#### Handle Payment Success

```javascript
// src/pages/PaymentSuccess.js
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('sessionId');
      
      try {
        const response = await client.post('/payments/verify-payment', {
          sessionId
        });
        
        // Update user premium status in local storage
        const user = JSON.parse(localStorage.getItem('user'));
        user.isPremium = true;
        user.premiumExpiry = response.data.expiresAt;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Show success message
        alert('✅ Premium activated! You can now send unlimited messages.');
        
        // Redirect to messages/discover
        window.location.href = '/discover';
      } catch (error) {
        console.error('Payment verification failed:', error.response.data);
      }
    };
    
    verifyPayment();
  }, [searchParams]);
  
  return <div>Processing payment...</div>;
}
```

#### Check Premium Status

```javascript
// src/hooks/usePremiumStatus.js
import { useState, useEffect } from 'react';
import client from '../api/client';

export function usePremiumStatus() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await client.get('/payments/premium-status');
        setStatus(response.data);
      } catch (error) {
        console.error('Failed to check premium status:', error);
      }
    };
    
    checkStatus();
  }, []);
  
  return status;
}
```

### 5. Real-Time Messaging with Socket.IO

#### Setup Socket Connection

```javascript
// src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export function useSocket(userId, conversationId) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join conversation
    newSocket.emit('join-conversation', conversationId, userId);

    // Listen for new messages
    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    newSocket.on('user-typing', () => {
      setTyping(true);
    });

    newSocket.on('user-stop-typing', () => {
      setTyping(false);
    });

    return () => newSocket.close();
  }, [conversationId, userId]);

  const sendMessage = (content) => {
    socket?.emit('send-message', {
      conversationId,
      senderId: userId,
      content,
      messageId: Date.now()
    });
  };

  const emitTyping = () => {
    socket?.emit('typing', conversationId);
  };

  const stopTyping = () => {
    socket?.emit('stop-typing', conversationId);
  };

  return { messages, typing, sendMessage, emitTyping, stopTyping };
}
```

#### Use in Chat Component

```javascript
// src/pages/Chat.js
import { useSocket } from '../hooks/useSocket';
import { usePremiumStatus } from '../hooks/usePremiumStatus';
import client from '../api/client';

export default function Chat({ conversationId, userId }) {
  const { messages, typing, sendMessage, emitTyping, stopTyping } = useSocket(userId, conversationId);
  const premiumStatus = usePremiumStatus();
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Check premium status
    if (!premiumStatus?.canSendMessages) {
      alert('Premium membership required to send messages. Subscribe now!');
      window.location.href = '/premium';
      return;
    }

    // Send via API for database storage
    try {
      await client.post('/messages/send', {
        conversationId,
        receiverId: 'receiverId',
        content: messageText
      });

      // Also emit via Socket.IO for real-time delivery
      sendMessage(messageText);
      setMessageText('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    emitTyping();
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            <p>{msg.content}</p>
            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
        {typing && <p className="typing">User is typing...</p>}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageText}
          onChange={handleInputChange}
          placeholder={premiumStatus?.canSendMessages ? "Type a message..." : "Upgrade to premium to message"}
          disabled={!premiumStatus?.canSendMessages}
        />
        <button type="submit" disabled={!premiumStatus?.canSendMessages}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### 6. Discover Page (Browse Profiles)

```javascript
// src/pages/Discover.js
import { useState, useEffect } from 'react';
import client from '../api/client';

export default function Discover() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await client.get('/auth/discover');
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleStartChat = async (userId) => {
    try {
      const response = await client.post(`/messages/conversation/${userId}`);
      window.location.href = `/chat/${response.data._id}`;
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (loading) return <div>Loading profiles...</div>;

  return (
    <div className="discover-container">
      <h1>Discover</h1>
      <div className="profiles-grid">
        {users.map(user => (
          <div key={user._id} className="profile-card">
            <img src={user.profilePicture} alt={user.firstName} />
            <h3>{user.firstName}, {user.age}</h3>
            <p>{user.location}</p>
            <p className="bio">{user.bio}</p>
            <button onClick={() => handleStartChat(user._id)}>
              Start Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🛠️ Environment Variables (Frontend)

```
# .env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

## 📱 Mobile Considerations

- Use responsive design for mobile screens
- Consider mobile-specific messaging UI
- Handle connection drops for Socket.IO gracefully
- Implement notification system for incoming messages

## 🔐 Security Notes

- Never store JWT tokens in localStorage in production (use httpOnly cookies)
- Validate all user inputs on frontend
- Check premium status before allowing message send
- Handle token expiration gracefully

## ✅ Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Profile pages display correctly
- [ ] Premium payment flow completes
- [ ] Messages send and receive in real-time
- [ ] Typing indicators work
- [ ] Premium verification prevents non-premium users from messaging
- [ ] Read receipts update correctly

---

For backend API documentation, see `README.md` in the dating-app directory.
