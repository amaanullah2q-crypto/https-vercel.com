const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  stripeSessionId: {
    type: String,
    default: null
  },
  planType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: null
  },
  
  // Payout Information - AUTOMATIC OWNER PAYOUT
  payoutAmount: {
    type: Number,
    default: null
  },
  payoutPercentage: {
    type: Number,
    default: 80  // 80% goes to owner
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  stripePayoutId: {
    type: String,
    default: null
  },
  
  // Premium dates
  premiumStartDate: {
    type: Date,
    required: true
  },
  premiumEndDate: {
    type: Date,
    required: true
  },
  
  // Receipt & metadata
  receipt: {
    type: String,
    default: null
  },
  metadata: {
    type: Object,
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payoutStatus: 1 });
paymentSchema.index({ createdAt: -1 });

// Method to calculate payout
paymentSchema.methods.calculatePayout = function() {
  return (this.amount * this.payoutPercentage) / 100;
};

module.exports = mongoose.model('Payment', paymentSchema);
