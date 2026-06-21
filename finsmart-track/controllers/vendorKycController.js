import VendorKyc from '../models/VendorKyc.js';
import User from '../models/User.js';

// Get KYC details for a vendor
export const getVendorKyc = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const kyc = await VendorKyc.findOne({ vendor: vendorId })
      .populate('vendor', 'name email phone vendorType')
      .populate('reviewedBy', 'name email');

    if (!kyc) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC record not found'
      });
    }

    res.json({
      status: 'success',
      data: kyc
    });
  } catch (error) {
    console.error('Error fetching vendor KYC:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendor KYC',
      error: error.message
    });
  }
};

// Create or update KYC record
export const createOrUpdateKyc = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const kycData = req.body;

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    let kyc = await VendorKyc.findOne({ vendor: vendorId });

    if (kyc) {
      // Update existing KYC
      Object.assign(kyc, kycData);
      kyc.submissionHistory.push({
        submittedAt: new Date(),
        submittedData: kycData,
        status: kyc.status,
        comments: 'Updated by vendor'
      });
    } else {
      // Create new KYC
      kyc = new VendorKyc({
        vendor: vendorId,
        vendorType: vendor.vendorType,
        ...kycData,
        submissionHistory: [{
          submittedAt: new Date(),
          submittedData: kycData,
          status: 'pending',
          comments: 'Initial submission'
        }]
      });
    }

    await kyc.save();

    res.json({
      status: 'success',
      message: 'KYC record saved successfully',
      data: kyc
    });
  } catch (error) {
    console.error('Error saving KYC:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error saving KYC record',
      error: error.message
    });
  }
};

// Approve vendor KYC
export const approveKyc = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (!kyc) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC record not found'
      });
    }

    kyc.status = 'approved';
    kyc.reviewedBy = adminId;
    kyc.reviewedAt = new Date();
    kyc.approvalNotes = notes || '';
    kyc.riskScore = Math.min(kyc.riskScore || 50, 30); // Lower risk score on approval
    kyc.riskLevel = 'low';
    kyc.submissionHistory.push({
      submittedAt: new Date(),
      status: 'approved',
      comments: notes || 'KYC approved'
    });

    // Update vendor status
    await User.findByIdAndUpdate(
      vendorId,
      { kycStatus: 'approved', status: 'verified' }
    );

    await kyc.save();

    res.json({
      status: 'success',
      message: 'KYC approved successfully',
      data: kyc
    });
  } catch (error) {
    console.error('Error approving KYC:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error approving KYC',
      error: error.message
    });
  }
};

// Reject vendor KYC
export const rejectKyc = async (req, res) => {
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

    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (!kyc) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC record not found'
      });
    }

    kyc.status = 'rejected';
    kyc.reviewedBy = adminId;
    kyc.reviewedAt = new Date();
    kyc.rejectionReason = reason;
    kyc.riskScore = Math.max(kyc.riskScore || 50, 70); // Higher risk score on rejection
    kyc.riskLevel = 'high';
    kyc.submissionHistory.push({
      submittedAt: new Date(),
      status: 'rejected',
      comments: reason
    });

    // Update vendor status
    await User.findByIdAndUpdate(
      vendorId,
      { kycStatus: 'rejected', status: 'suspended' }
    );

    await kyc.save();

    res.json({
      status: 'success',
      message: 'KYC rejected successfully',
      data: kyc
    });
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting KYC',
      error: error.message
    });
  }
};

// Request KYC resubmission
export const requestResubmission = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Resubmission reason is required'
      });
    }

    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (!kyc) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC record not found'
      });
    }

    kyc.status = 'resubmit-required';
    kyc.reviewedBy = adminId;
    kyc.reviewedAt = new Date();
    kyc.rejectionReason = reason;
    kyc.submissionHistory.push({
      submittedAt: new Date(),
      status: 'resubmit-required',
      comments: reason
    });

    await User.findByIdAndUpdate(
      vendorId,
      { kycStatus: 'pending' }
    );

    await kyc.save();

    res.json({
      status: 'success',
      message: 'Resubmission requested successfully',
      data: kyc
    });
  } catch (error) {
    console.error('Error requesting resubmission:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error requesting resubmission',
      error: error.message
    });
  }
};

// Update risk assessment
export const updateRiskAssessment = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { riskScore, riskLevel, amlStatus, sanctionsCheck, pepCheck } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const kyc = await VendorKyc.findOne({ vendor: vendorId });
    if (!kyc) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC record not found'
      });
    }

    if (riskScore !== undefined) kyc.riskScore = riskScore;
    if (riskLevel !== undefined) kyc.riskLevel = riskLevel;

    if (amlStatus) {
      kyc.amlCheck = {
        status: amlStatus.status,
        checkedAt: new Date(),
        checkedBy: adminId,
        findings: amlStatus.findings
      };
    }

    if (sanctionsCheck !== undefined) {
      kyc.sanctions = {
        checked: true,
        result: sanctionsCheck,
        checkedAt: new Date()
      };
    }

    if (pepCheck !== undefined) {
      kyc.pep = {
        checked: true,
        result: pepCheck,
        checkedAt: new Date()
      };
    }

    await kyc.save();

    res.json({
      status: 'success',
      message: 'Risk assessment updated successfully',
      data: kyc
    });
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating risk assessment',
      error: error.message
    });
  }
};

// Get all pending KYC records
export const getPendingKyc = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const kycRecords = await VendorKyc.find({ status: { $in: ['pending', 'under-review'] } })
      .populate('vendor', 'name email phone vendorType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VendorKyc.countDocuments({ status: { $in: ['pending', 'under-review'] } });

    res.json({
      status: 'success',
      data: kycRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pending KYC records:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending KYC records',
      error: error.message
    });
  }
};

// Get high-risk vendors
export const getHighRiskVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const kycRecords = await VendorKyc.find({ riskLevel: { $in: ['high', 'critical'] } })
      .populate('vendor', 'name email phone vendorType status')
      .sort({ riskScore: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VendorKyc.countDocuments({ riskLevel: { $in: ['high', 'critical'] } });

    res.json({
      status: 'success',
      data: kycRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching high-risk vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching high-risk vendors',
      error: error.message
    });
  }
};
