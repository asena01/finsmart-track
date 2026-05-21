import TourBooking from '../models/TourBooking.js';
import Tour from '../models/Tour.js';
import VendorChat from '../models/VendorChat.js';
import mongoose from 'mongoose';

// Helper function to generate booking number
const generateBookingNumber = () => {
  return 'TBK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Helper function to calculate tax (10% tax rate)
const calculateTax = (subtotal) => {
  return Math.round(subtotal * 0.1 * 100) / 100;
};

// Helper function to create vendor chat for booking
const createBookingChat = async (booking, tour, customerName) => {
  try {
    const vendorChat = new VendorChat({
      customerId: booking.customer,
      bookingId: booking._id.toString(),
      vendorId: tour.tourOperator?.toString() || 'unknown',
      vendorName: tour.tourOperatorName || 'Tour Operator',
      vendorType: 'tour',
      vendorIcon: '✈️',
      subject: `Booking for ${tour.name}`,
      status: 'open',
      messages: [
        {
          _id: new mongoose.Types.ObjectId(),
          sender: 'vendor',
          senderName: tour.tourOperatorName || 'Tour Operator',
          message: `Welcome! Your booking for ${tour.name} has been confirmed. Feel free to ask any questions.`,
          timestamp: new Date(),
          read: false
        }
      ]
    });
    await vendorChat.save();
    console.log('✅ Vendor chat created for tour booking:', vendorChat._id);
    return vendorChat;
  } catch (error) {
    console.error('⚠️ Error creating vendor chat:', error.message);
    return null;
  }
};

// CREATE tour booking with payment
export const createTourBooking = async (req, res) => {
  try {
    const {
      tourId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      numberOfParticipants,
      startDate,
      endDate,
      pricePerPerson,
      numberOfDays,
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
    if (!tourId || !customerId || !numberOfParticipants || !pricePerPerson || !paymentMethod) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Validate card details if paying by card
    if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (!cardNumber || !expiryMonth || !expiryYear || !cvv)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid card details'
      });
    }

    // Get tour details
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    // Check if tour has capacity
    if (tour.currentParticipants + numberOfParticipants > tour.maxParticipants) {
      return res.status(400).json({
        status: 'error',
        message: 'Not enough capacity for this tour'
      });
    }

    // Calculate pricing
    const subtotal = pricePerPerson * numberOfParticipants;
    const tax = calculateTax(subtotal);
    const totalPrice = subtotal + tax;

    // Create booking
    const booking = new TourBooking({
      bookingNumber: generateBookingNumber(),
      tour: tourId,
      tourOperator: tour.tourOperator, // Set operator from tour
      tourName: tour.name,
      destination: tour.destination,
      customer: customerId,
      customerName,
      customerEmail,
      customerPhone,
      numberOfParticipants,
      startDate,
      endDate,
      numberOfDays,
      pricePerPerson,
      subtotal,
      tax,
      totalPrice,
      paymentMethod,
      cardDetails: {
        cardholderName,
        cardLastFour: cardNumber ? cardNumber.slice(-4) : null,
        cardBrand: cardNumber ? getCardBrand(cardNumber) : null,
        expiryMonth,
        expiryYear
      },
      billingAddress,
      specialRequirements,
      notes,
      paymentStatus: 'processing'
    });

    // Simulate payment processing (in production, integrate with Stripe/PayPal)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark as paid
    booking.paymentStatus = 'completed';
    booking.paidAt = new Date();
    booking.status = 'confirmed';
    booking.paymentReference = 'TXN-' + Date.now();

    await booking.save();

    // Create vendor chat for booking
    await createBookingChat(booking, tour, customerName);

    // Update tour participants
    tour.currentParticipants += numberOfParticipants;
    await tour.save();

    res.status(201).json({
      status: 'success',
      message: 'Booking created and payment processed successfully',
      data: {
        bookingNumber: booking.bookingNumber,
        tourName: booking.tourName,
        destination: booking.destination,
        numberOfParticipants: booking.numberOfParticipants,
        totalPrice: booking.totalPrice,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        paymentReference: booking.paymentReference
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET booking details
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await TourBooking.findById(bookingId)
      .populate('tour', 'name destination duration')
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

// GET customer bookings
export const getCustomerBookings = async (req, res) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bookings = await TourBooking.find({ customer: customerId })
      .populate('tour', 'name destination duration')
      .skip(skip)
      .limit(limit)
      .sort({ bookedAt: -1 });

    const total = await TourBooking.countDocuments({ customer: customerId });

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        total,
        page,
        limit,
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

// GET all bookings (admin)
export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, paymentStatus, tourOperator } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (tourOperator) filter.tourOperator = tourOperator; // Filter by tour operator/agency

    const bookings = await TourBooking.find(filter)
      .populate('tour', 'name destination')
      .populate('customer', 'name email')
      .populate('tourOperator', 'name email') // Populate operator details
      .skip(skip)
      .limit(limit)
      .sort({ bookedAt: -1 });

    const total = await TourBooking.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        total,
        page,
        limit,
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

// CANCEL booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await TourBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking is already cancelled'
      });
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.paymentStatus = 'refunded';

    await booking.save();

    // Update tour participants
    const tour = await Tour.findById(booking.tour);
    if (tour) {
      tour.currentParticipants -= booking.numberOfParticipants;
      await tour.save();
    }

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

// UPDATE booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    const booking = await TourBooking.findByIdAndUpdate(
      bookingId,
      { status, updatedAt: Date.now() },
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

// Helper function to determine card brand
const getCardBrand = (cardNumber) => {
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/
  };

  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }
  return 'Unknown';
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { bookingId, paymentReference } = req.body;

    const booking = await TourBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.paymentReference === paymentReference && booking.paymentStatus === 'completed') {
      res.status(200).json({
        status: 'success',
        message: 'Payment verified',
        data: {
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.status,
          totalPrice: booking.totalPrice
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
