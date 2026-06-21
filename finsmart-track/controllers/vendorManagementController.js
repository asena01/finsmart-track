import User from '../models/User.js';
import VendorKyc from '../models/VendorKyc.js';
import VendorPerformance from '../models/VendorPerformance.js';

// Get all vendors with filtering
export const getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, vendorType, status, kycStatus, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { userType: 'vendor' };

    if (vendorType) {
      query.vendorType = vendorType;
    }

    if (status) {
      query.status = status;
    }

    if (kycStatus) {
      query.kycStatus = kycStatus;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const vendors = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Enrich with KYC and Performance data
    const enrichedVendors = await Promise.all(
      vendors.map(async (vendor) => {
        const kyc = await VendorKyc.findOne({ vendor: vendor._id });
        const performance = await VendorPerformance.findOne({ vendor: vendor._id });

        return {
          ...vendor.toObject(),
          kycStatus: vendor.kycStatus || 'pending',
          monthlyRevenue: performance?.revenue?.thisMonth || 0,
          rating: performance?.rating?.average || 0,
          bookings: performance?.bookings?.total || 0,
          reviews: performance?.reviews?.total || 0,
          performanceLevel: performance?.performanceLevel || 'standard'
        };
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      data: enrichedVendors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendors',
      error: error.message
    });
  }
};

// Get single vendor details
export const getVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findById(vendorId).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Get enriched data
    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    const performance = await VendorPerformance.findOne({ vendor: vendorId });

    res.json({
      status: 'success',
      data: {
        ...vendor.toObject(),
        kyc: kyc || null,
        performance: performance || null
      }
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendor',
      error: error.message
    });
  }
};

// Create vendor (admin only)
export const createVendor = async (req, res) => {
  try {
    const vendorData = req.body;

    // Check if vendor with email already exists
    const existingVendor = await User.findOne({ email: vendorData.email });
    if (existingVendor) {
      return res.status(400).json({
        status: 'error',
        message: 'Vendor with this email already exists'
      });
    }

    const vendor = new User({
      ...vendorData,
      userType: 'vendor',
      status: 'pending',
      kycStatus: 'pending'
    });

    // Hash password if provided
    if (vendorData.password) {
      vendor.password = vendorData.password; // In production, use bcrypt
    }

    await vendor.save();

    // Create KYC record
    const kyc = new VendorKyc({
      vendor: vendor._id,
      vendorType: vendor.vendorType,
      status: 'pending'
    });
    await kyc.save();

    // Create Performance record
    const performance = new VendorPerformance({
      vendor: vendor._id,
      vendorType: vendor.vendorType
    });
    await performance.save();

    res.json({
      status: 'success',
      message: 'Vendor created successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating vendor',
      error: error.message
    });
  }
};

// Update vendor
export const updateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updateData = req.body;

    // Don't allow updating password through this endpoint
    delete updateData.password;

    const vendor = await User.findByIdAndUpdate(vendorId, updateData, { new: true }).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vendor updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating vendor',
      error: error.message
    });
  }
};

// Delete vendor
export const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findByIdAndDelete(vendorId);

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Also delete related KYC and Performance records
    await VendorKyc.deleteOne({ vendor: vendorId });
    await VendorPerformance.deleteOne({ vendor: vendorId });

    res.json({
      status: 'success',
      message: 'Vendor deleted successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting vendor',
      error: error.message
    });
  }
};

// Approve vendor
export const approveVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { status: 'active', kycStatus: 'approved' },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Update KYC record
    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (kyc) {
      kyc.status = 'approved';
      kyc.reviewedBy = adminId;
      kyc.reviewedAt = new Date();
      kyc.approvalNotes = notes || '';
      await kyc.save();
    }

    res.json({
      status: 'success',
      message: 'Vendor approved successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error approving vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error approving vendor',
      error: error.message
    });
  }
};

// Reject vendor
export const rejectVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { status: 'suspended', kycStatus: 'rejected' },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Update KYC record
    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (kyc) {
      kyc.status = 'rejected';
      kyc.reviewedBy = adminId;
      kyc.reviewedAt = new Date();
      kyc.rejectionReason = reason;
      await kyc.save();
    }

    res.json({
      status: 'success',
      message: 'Vendor rejected successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting vendor',
      error: error.message
    });
  }
};

// Suspend vendor
export const suspendVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { status: 'suspended', suspensionReason: reason },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vendor suspended successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error suspending vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error suspending vendor',
      error: error.message
    });
  }
};

// Block vendor
export const blockVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { status: 'blocked', blockReason: reason },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vendor blocked successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error blocking vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error blocking vendor',
      error: error.message
    });
  }
};

// Get vendor statistics
export const getVendorStats = async (req, res) => {
  try {
    const totalVendors = await User.countDocuments({ userType: 'vendor' });
    const activeVendors = await User.countDocuments({ userType: 'vendor', status: 'active' });
    const pendingVendors = await User.countDocuments({ userType: 'vendor', status: 'pending' });
    const suspendedVendors = await User.countDocuments({ userType: 'vendor', status: 'suspended' });
    const blockedVendors = await User.countDocuments({ userType: 'vendor', status: 'blocked' });

    const vendorsByType = await User.aggregate([
      { $match: { userType: 'vendor' } },
      { $group: { _id: '$vendorType', count: { $sum: 1 } } }
    ]);

    res.json({
      status: 'success',
      data: {
        totalVendors,
        activeVendors,
        pendingVendors,
        suspendedVendors,
        blockedVendors,
        vendorsByType
      }
    });
  } catch (error) {
    console.error('Error fetching vendor statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendor statistics',
      error: error.message
    });
  }
};
