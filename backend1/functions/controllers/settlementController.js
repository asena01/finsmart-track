import Settlement from '../models/Settlement.js';
import Payout from '../models/Payout.js';
import User from '../models/User.js';
import Finance from '../models/Finance.js';

// Get all settlements with filters
export const getSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 10, vendorId, status, startDate, endDate, vendorType } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (vendorId) query.vendor = vendorId;
    if (status) query.status = status;
    if (vendorType) query.vendorType = vendorType;

    if (startDate && endDate) {
      query['period.startDate'] = { $gte: new Date(startDate) };
      query['period.endDate'] = { $lte: new Date(endDate) };
    }

    const settlements = await Settlement.find(query)
      .populate('vendor', 'name email vendorType')
      .populate('reviewedBy', 'name email')
      .sort({ 'period.startDate': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Settlement.countDocuments(query);

    res.json({
      status: 'success',
      data: settlements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching settlements',
      error: error.message
    });
  }
};

// Get settlement by ID
export const getSettlementById = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId)
      .populate('vendor', 'name email vendorType phone')
      .populate('reviewedBy', 'name email')
      .populate('payout.id');

    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    res.json({
      status: 'success',
      data: settlement
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching settlement',
      error: error.message
    });
  }
};

// Create settlement
export const createSettlement = async (req, res) => {
  try {
    const { vendorId, period, platformCommission } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    // Get vendor
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Get vendor finance data for the period
    const finance = await Finance.findOne({ vendor: vendorId });
    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor finance data not found'
      });
    }

    // Calculate settlement amounts
    const totalRevenue = finance.revenue?.thisMonth || 0;
    const commissionAmount = (totalRevenue * platformCommission) / 100;
    const paymentGatewayFees = totalRevenue * 0.029 + 0.30; // Stripe standard fees
    const netAmount = totalRevenue - commissionAmount - paymentGatewayFees;

    const settlement = new Settlement({
      vendor: vendorId,
      vendorType: vendor.vendorType,
      period: {
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate)
      },
      financialSummary: {
        totalRevenue,
        platformCommission,
        commissionAmount,
        paymentGatewayFees,
        netAmount
      },
      status: 'draft',
      createdBy: adminId
    });

    await settlement.save();

    res.status(201).json({
      status: 'success',
      message: 'Settlement created successfully',
      data: settlement
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating settlement',
      error: error.message
    });
  }
};

// Update settlement
export const updateSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const updateData = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    updateData.lastModifiedBy = adminId;

    const settlement = await Settlement.findByIdAndUpdate(settlementId, updateData, { new: true });

    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Settlement updated successfully',
      data: settlement
    });
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating settlement',
      error: error.message
    });
  }
};

// Approve settlement
export const approveSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const settlement = await Settlement.findByIdAndUpdate(
      settlementId,
      {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        approvalNotes: notes
      },
      { new: true }
    );

    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Settlement approved successfully',
      data: settlement
    });
  } catch (error) {
    console.error('Error approving settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error approving settlement',
      error: error.message
    });
  }
};

// Reject settlement
export const rejectSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    const settlement = await Settlement.findByIdAndUpdate(
      settlementId,
      {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason
      },
      { new: true }
    );

    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Settlement rejected successfully',
      data: settlement
    });
  } catch (error) {
    console.error('Error rejecting settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting settlement',
      error: error.message
    });
  }
};

// Create payout from settlement
export const createPayout = async (req, res) => {
  try {
    const { settlementId, method, scheduledDate } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    if (settlement.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Only approved settlements can be paid out'
      });
    }

    const payout = new Payout({
      settlement: settlementId,
      vendor: settlement.vendor,
      amount: settlement.financialSummary.netAmount,
      method,
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled',
      createdBy: adminId
    });

    await payout.save();

    // Update settlement with payout reference
    settlement.payout = {
      id: payout._id,
      amount: payout.amount,
      method: payout.method,
      status: payout.status,
      scheduledDate: payout.scheduledDate
    };
    settlement.status = 'settled';
    await settlement.save();

    res.status(201).json({
      status: 'success',
      message: 'Payout created successfully',
      data: payout
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating payout',
      error: error.message
    });
  }
};

// Delete settlement (draft only)
export const deleteSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({
        status: 'error',
        message: 'Settlement not found'
      });
    }

    if (settlement.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft settlements can be deleted'
      });
    }

    await Settlement.findByIdAndDelete(settlementId);

    res.json({
      status: 'success',
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting settlement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting settlement',
      error: error.message
    });
  }
};

// Get settlement statistics
export const getSettlementStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query['period.startDate'] = { $gte: new Date(startDate) };
      query['period.endDate'] = { $lte: new Date(endDate) };
    }

    const totalSettlements = await Settlement.countDocuments(query);
    const approvedSettlements = await Settlement.countDocuments({ ...query, status: 'approved' });
    const rejectedSettlements = await Settlement.countDocuments({ ...query, status: 'rejected' });
    const pendingSettlements = await Settlement.countDocuments({ ...query, status: 'pending-review' });

    const stats = await Settlement.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$financialSummary.totalRevenue' },
          totalCommission: { $sum: '$financialSummary.commissionAmount' },
          totalNetAmount: { $sum: '$financialSummary.netAmount' },
          averageNetAmount: { $avg: '$financialSummary.netAmount' }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        total: totalSettlements,
        approved: approvedSettlements,
        rejected: rejectedSettlements,
        pending: pendingSettlements,
        financials: stats[0] || {
          totalRevenue: 0,
          totalCommission: 0,
          totalNetAmount: 0,
          averageNetAmount: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching settlement stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching settlement statistics',
      error: error.message
    });
  }
};
