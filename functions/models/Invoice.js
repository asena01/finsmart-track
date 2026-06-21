import mongoose from 'mongoose';
const { Schema } = mongoose;

const InvoiceSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guestName: String,
  guestEmail: String,
  guestPhone: String,
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: Number,
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  paidDate: Date,
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'cash', 'bank_transfer', 'online', 'cheque']
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
    default: 'issued'
  },
  description: String,
  notes: String,
  items: [{
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

InvoiceSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    const itemTotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.totalAmount = itemTotal + (this.tax || 0) - (this.discount || 0);
  }
  next();
});

InvoiceSchema.index({ hotel: 1, invoiceNumber: 1 });
InvoiceSchema.index({ guest: 1 });
InvoiceSchema.index({ issueDate: 1 });

export default mongoose.model('Invoice', InvoiceSchema);
