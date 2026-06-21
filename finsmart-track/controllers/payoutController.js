import Payout from '../models/Payout.js';
import PayoutSchedule from '../models/PayoutSchedule.js';

// Get all payouts
export const getPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 10, vendorId, status, method } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (vendorId) query.vendor = vendorId;
    if (status) query.status = status;
    if (method) query.method = method;

    const payouts = await Payout.find(query)
      .populate('vendor', 'name email')
      .populate('settlement')
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payout.countDocuments(query);

    res.json({
      status: 'success',
      data: payouts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching payouts', error: error.message });
  }
};

// Get payout by ID
export const getPayoutById = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const payout = await Payout.findById(payoutId)
      .populate('vendor', 'name email')
      .populate('settlement');

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    res.json({ status: 'success', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching payout', error: error.message });
  }
};

// Create payout
export const createPayout = async (req, res) => {
  try {
    const { settlement, vendor, amount, method, scheduledDate } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const payout = new Payout({
      settlement,
      vendor,
      amount,
      method,
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled',
      createdBy: adminId
    });

    await payout.save();

    res.status(201).json({
      status: 'success',
      message: 'Payout created successfully',
      data: payout
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error creating payout', error: error.message });
  }
};

// Update payout
export const updatePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const updateData = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    updateData.lastModifiedBy = adminId;

    const payout = await Payout.findByIdAndUpdate(payoutId, updateData, { new: true });

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    res.json({ status: 'success', message: 'Payout updated successfully', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating payout', error: error.message });
  }
};

// Approve payout
export const approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      { verificationStatus: 'verified', verifiedBy: adminId, verifiedAt: new Date() },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    res.json({ status: 'success', message: 'Payout approved successfully', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error approving payout', error: error.message });
  }
};

// Process payout
export const processPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { processor, processorReferenceId, trackingNumber } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      {
        status: 'processing',
        processor,
        processorReferenceId,
        trackingNumber,
        processedDate: new Date(),
        approvedBy: adminId
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    res.json({ status: 'success', message: 'Payout processing initiated', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error processing payout', error: error.message });
  }
};

// Mark payout as completed
export const completePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      { status: 'completed', completedDate: new Date() },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    // Update payout schedule
    await PayoutSchedule.updateOne(
      { vendor: payout.vendor },
      {
        lastPayoutDate: new Date(),
        lastPayoutAmount: payout.amount,
        lastPayoutId: payoutId,
        $inc: { 'statistics.totalPayoutsCompleted': 1, 'statistics.totalPayoutAmount': payout.amount }
      }
    );

    res.json({ status: 'success', message: 'Payout marked as completed', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error completing payout', error: error.message });
  }
};

// Retry failed payout
export const retryPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const payout = await Payout.findById(payoutId);

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    if (payout.retryCount >= payout.maxRetries) {
      return res.status(400).json({ status: 'error', message: 'Maximum retries exceeded' });
    }

    payout.retryCount++;
    payout.status = 'processing';
    payout.processedDate = new Date();
    payout.approvedBy = adminId;
    await payout.save();

    res.json({ status: 'success', message: 'Payout retry initiated', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error retrying payout', error: error.message });
  }
};

// Cancel payout
export const cancelPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      { status: 'cancelled', failureReason: reason },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ status: 'error', message: 'Payout not found' });
    }

    res.json({ status: 'success', message: 'Payout cancelled successfully', data: payout });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error cancelling payout', error: error.message });
  }
};

// Get payout schedule
export const getPayoutSchedule = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const schedule = await PayoutSchedule.findOne({ vendor: vendorId });

    if (!schedule) {
      return res.status(404).json({ status: 'error', message: 'Payout schedule not found' });
    }

    res.json({ status: 'success', data: schedule });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching payout schedule', error: error.message });
  }
};

// Update payout schedule
export const updatePayoutSchedule = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const scheduleData = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    let schedule = await PayoutSchedule.findOne({ vendor: vendorId });

    if (!schedule) {
      schedule = new PayoutSchedule({
        vendor: vendorId,
        vendorType: scheduleData.vendorType,
        createdBy: adminId,
        ...scheduleData
      });
    } else {
      Object.assign(schedule, scheduleData);
      schedule.updatedBy = adminId;
    }

    await schedule.save();

    res.json({ status: 'success', message: 'Payout schedule updated successfully', data: schedule });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating payout schedule', error: error.message });
  }
};
