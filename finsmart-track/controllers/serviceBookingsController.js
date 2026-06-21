import ServiceBooking from '../models/ServiceBooking.js';
import Service from '../models/Service.js';
import VendorChat from '../models/VendorChat.js';
import mongoose from 'mongoose';

/**
 * Generate unique booking number
 */
const generateBookingNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SB-${timestamp}-${random}`;
};

/**
 * Validate card number using Luhn algorithm
 */
const validateCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Create vendor chat for service booking
 */
const createServiceBookingChat = async (booking, serviceDetails, customerName) => {
  try {
    const vendorChat = new VendorChat({
      customerId: booking.customer,
      bookingId: booking._id.toString(),
      vendorId: serviceDetails.serviceProvider?.toString() || 'unknown',
      vendorName: serviceDetails.providerName || 'Service Provider',
      vendorType: 'service',
      vendorIcon: serviceDetails.icon || '🔧',
      subject: `Booking for ${serviceDetails.name}`,
      status: 'open',
      messages: [
        {
          _id: new mongoose.Types.ObjectId(),
          sender: 'vendor',
          senderName: serviceDetails.providerName || 'Service Provider',
          message: `Your booking for ${serviceDetails.name} on ${booking.bookingDate} has been confirmed. We look forward to serving you!`,
          timestamp: new Date(),
          read: false
        }
      ]
    });
    await vendorChat.save();
    console.log('✅ Vendor chat created for service booking:', vendorChat._id);
    return vendorChat;
  } catch (error) {
    console.error('⚠️ Error creating vendor chat:', error.message);
    return null;
  }
};

/**
 * Get card brand
 */
const getCardBrand = (cardNumber) => {
  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/
  };
  
  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber.replace(/\s/g, ''))) {
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }
  return 'Unknown';
};

/**
 * Calculate tax (10%)
 */
const calculateTax = (amount) => {
  return Math.round(amount * 0.1 * 100) / 100;
};

/**
 * Create service booking with payment
 */
export const createServiceBooking = async (req, res) => {
  try {
    const {
      service,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      startTime,
      endTime,
      duration,
      durationUnit,
      serviceLocation,
      quantity,
      paymentMethod,
      cardholderName,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      billingAddress,
      specialRequirements,
      notes
    } = req.body;

    // Validate required fields
    if (!service || !customerId || !customerName || !customerEmail || !bookingDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Fetch service details
    const serviceDetails = await Service.findById(service);
    if (!serviceDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    // Validate booking time is within staff working hours
    if (startTime && endTime && bookingDate) {
      const db = req.app.locals.db;
      if (db) {
        const staffCollection = db.collection('service-staff');
        const availableStaff = await staffCollection.findOne({
          providerId: serviceDetails.serviceProvider.toString(),
          status: 'active'
        });

        if (availableStaff && availableStaff.workingHours) {
          const bookingHour = parseInt(startTime.split(':')[0]);
          const dayName = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'lowercase' });
          const dayHours = availableStaff.workingHours[dayName];

          if (dayHours && dayHours.open && dayHours.close) {
            const openHour = parseInt(dayHours.open.split(':')[0]);
            const closeHour = parseInt(dayHours.close.split(':')[0]);

            if (bookingHour < openHour || bookingHour >= closeHour) {
              return res.status(400).json({
                status: 'error',
                message: `Service is not available at ${startTime}. Working hours: ${dayHours.open} - ${dayHours.close}`
              });
            }
          }
        }
      }
    }

    // Validate payment details if credit/debit card
    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
        return res.status(400).json({
          status: 'error',
          message: 'Card details required'
        });
      }

      // Validate card number
      if (!validateCardNumber(cardNumber)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid card number'
        });
      }

      // Validate expiry
      const now = new Date();
      const expiryDate = new Date(parseInt(expiryYear), parseInt(expiryMonth) - 1);
      if (expiryDate < now) {
        return res.status(400).json({
          status: 'error',
          message: 'Card has expired'
        });
      }

      // Validate CVV
      if (!/^\d{3,4}$/.test(cvv)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid CVV'
        });
      }
    }

    // Calculate pricing
    const unitPrice = serviceDetails.basePrice;
    const qty = quantity || 1;
    const subtotal = Math.round(unitPrice * qty * 100) / 100;
    const tax = calculateTax(subtotal);
    const totalPrice = subtotal + tax;

    // Create booking
    const booking = new ServiceBooking({
      bookingNumber: generateBookingNumber(),
      service,
      serviceName: serviceDetails.name,
      serviceCategory: serviceDetails.category,
      serviceProvider: serviceDetails.serviceProvider,
      providerName: serviceDetails.providerName,
      customer: customerId,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      startTime,
      endTime,
      duration: duration || 1,
      durationUnit: durationUnit || 'hour',
      serviceLocation,
      pricing: {
        basePrice: unitPrice,
        unitPrice,
        quantity: qty,
        subtotal,
        tax,
        totalPrice
      },
      paymentMethod,
      paymentStatus: 'pending',
      billingAddress,
      specialRequirements,
      notes,
      status: 'pending'
    });

    // Add card details if provided
    if (cardNumber) {
      const last4 = cardNumber.slice(-4);
      booking.cardDetails = {
        cardholderName,
        last4Digits: last4,
        brand: getCardBrand(cardNumber),
        expiryMonth,
        expiryYear
      };
    }

    // Process payment (mock)
    // In production, integrate with Stripe, PayPal, etc.
    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';

    await booking.save();

    // Create vendor chat for booking
    await createServiceBookingChat(booking, serviceDetails, customerName);

    // Update service current bookings
    await Service.findByIdAndUpdate(
      service,
      { $inc: { currentBookings: 1 } }
    );

    res.status(201).json({
      status: 'success',
      message: 'Booking created and payment processed successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get booking details
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await ServiceBooking.findById(bookingId)
      .populate('service')
      .populate('serviceProvider', 'name email phone')
      .populate('customer', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get customer bookings
 */
export const getCustomerBookings = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const bookings = await ServiceBooking.find({ customer: customerId })
      .populate('service')
      .populate('serviceProvider', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await ServiceBooking.countDocuments({ customer: customerId });

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get all bookings (admin/provider)
 */
export const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, serviceProvider } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (serviceProvider) filter.serviceProvider = serviceProvider;

    const skip = (page - 1) * limit;
    const bookings = await ServiceBooking.find(filter)
      .populate('service')
      .populate('customer', 'name email phone')
      .populate('serviceProvider', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await ServiceBooking.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    ).populate('service');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking status updated',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Cancel booking with refund
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await ServiceBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking already cancelled'
      });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Update service bookings count
    await Service.findByIdAndUpdate(
      booking.service,
      { $inc: { currentBookings: -1 } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled and refund processed',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Verify payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { bookingId, paymentReference } = req.body;

    const booking = await ServiceBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Mock verification - in production, verify with payment gateway
    if (booking.paymentStatus === 'completed') {
      res.status(200).json({
        status: 'success',
        message: 'Payment verified',
        data: booking
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Rate service after booking completion
 */
export const rateService = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      {
        customerRating: {
          rating,
          review,
          ratedAt: new Date()
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Rating submitted',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Assign staff to booking
 */
export const assignStaffToBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { staffId, staffName } = req.body;

    if (!staffId || !staffName) {
      return res.status(400).json({
        status: 'error',
        message: 'staffId and staffName are required'
      });
    }

    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      {
        assignedStaff: staffId,
        assignedStaffName: staffName,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('service').populate('customer', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Staff assigned successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Delete booking
 */
export const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await ServiceBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Only allow deletion of pending or cancelled bookings
    if (booking.status !== 'pending' && booking.status !== 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending or cancelled bookings can be deleted'
      });
    }

    // Decrement service bookings count if it was confirmed
    if (booking.status === 'confirmed') {
      await Service.findByIdAndUpdate(
        booking.service,
        { $inc: { currentBookings: -1 } }
      );
    }

    // Delete the booking
    await ServiceBooking.findByIdAndDelete(bookingId);

    res.status(200).json({
      status: 'success',
      message: 'Booking deleted successfully',
      data: { bookingId }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
