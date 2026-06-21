import Finance from '../models/Finance.js';

// Get finance details for vendor
export const getFinanceDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance information not found for this vendor'
      });
    }

    res.status(200).json({
      status: 'success',
      data: finance
    });
  } catch (error) {
    console.error('Error fetching finance details:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create finance record for vendor
export const createFinanceRecord = async (req, res) => {
  try {
    const { vendor, vendorType, bankDetails, taxDetails, businessInfo } = req.body;

    // Check if finance record already exists
    const existingFinance = await Finance.findOne({ vendor });
    if (existingFinance) {
      return res.status(400).json({
        status: 'error',
        message: 'Finance record already exists for this vendor'
      });
    }

    const finance = new Finance({
      vendor,
      vendorType,
      bankDetails: bankDetails || {},
      taxDetails: taxDetails || {},
      businessInfo: businessInfo || {},
      revenue: {
        monthlyRevenue: new Map(),
        yearlyRevenue: new Map(),
        revenueByCategory: new Map()
      }
    });

    await finance.save();

    res.status(201).json({
      status: 'success',
      message: 'Finance record created successfully',
      data: finance
    });
  } catch (error) {
    console.error('Error creating finance record:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update bank details
export const updateBankDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const bankDetails = req.body;

    let finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      finance = new Finance({
        vendor: vendorId,
        vendorType: req.body.vendorType || 'hotel',
        bankDetails
      });
    } else {
      finance.bankDetails = { ...finance.bankDetails, ...bankDetails };
    }

    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Bank details updated successfully',
      data: finance
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update tax details
export const updateTaxDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const taxDetails = req.body;

    let finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      finance = new Finance({
        vendor: vendorId,
        vendorType: req.body.vendorType || 'hotel',
        taxDetails
      });
    } else {
      finance.taxDetails = { ...finance.taxDetails, ...taxDetails };
    }

    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Tax details updated successfully',
      data: finance
    });
  } catch (error) {
    console.error('Error updating tax details:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update business information
export const updateBusinessInfo = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const businessInfo = req.body;

    let finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      finance = new Finance({
        vendor: vendorId,
        vendorType: req.body.vendorType || 'hotel',
        businessInfo
      });
    } else {
      finance.businessInfo = { ...finance.businessInfo, ...businessInfo };
    }

    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Business information updated successfully',
      data: finance
    });
  } catch (error) {
    console.error('Error updating business info:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get revenue information
export const getRevenueData = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance information not found'
      });
    }

    const revenueData = {
      monthlyRevenue: Object.fromEntries(finance.revenue.monthlyRevenue),
      yearlyRevenue: Object.fromEntries(finance.revenue.yearlyRevenue),
      totalRevenue: finance.revenue.totalRevenue,
      averageMonthlyRevenue: finance.revenue.averageMonthlyRevenue,
      revenueByCategory: Object.fromEntries(finance.revenue.revenueByCategory)
    };

    res.status(200).json({
      status: 'success',
      data: revenueData
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add monthly revenue
export const addMonthlyRevenue = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { month, year, amount, category } = req.body;

    const finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance information not found'
      });
    }

    const monthKey = `${year}-${month}`;
    finance.revenue.monthlyRevenue.set(monthKey, amount);

    // Update yearly revenue
    const yearlyKey = year.toString();
    const currentYearlyRevenue = finance.revenue.yearlyRevenue.get(yearlyKey) || 0;
    finance.revenue.yearlyRevenue.set(yearlyKey, currentYearlyRevenue + amount);

    // Update total and average
    const allMonthlyRevenues = Array.from(finance.revenue.monthlyRevenue.values());
    finance.revenue.totalRevenue = allMonthlyRevenues.reduce((sum, val) => sum + val, 0);
    finance.revenue.averageMonthlyRevenue = Math.round(finance.revenue.totalRevenue / allMonthlyRevenues.length);

    // Update by category if provided
    if (category) {
      const currentCategoryRevenue = finance.revenue.revenueByCategory.get(category) || 0;
      finance.revenue.revenueByCategory.set(category, currentCategoryRevenue + amount);
    }

    finance.revenue.lastRevenueUpdate = new Date();
    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Monthly revenue added successfully',
      data: finance
    });
  } catch (error) {
    console.error('Error adding monthly revenue:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get financial summary
export const getFinancialSummary = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance information not found'
      });
    }

    const summary = {
      // Bank Status
      bankVerified: finance.bankDetails.verificationStatus === 'verified',
      bankInfo: {
        holderName: finance.bankDetails.accountHolderName,
        bank: finance.bankDetails.bankName,
        status: finance.bankDetails.verificationStatus
      },

      // Tax Status
      taxFiled: finance.taxDetails.taxFilingStatus === 'filed',
      taxInfo: {
        id: finance.taxDetails.taxId,
        businessId: finance.taxDetails.businessRegistrationNumber,
        filingStatus: finance.taxDetails.taxFilingStatus,
        nextDue: finance.taxDetails.nextFilingDueDate
      },

      // Business Info
      businessInfo: {
        name: finance.businessInfo.businessName,
        id: finance.businessInfo.businessId,
        license: finance.businessInfo.licenseNumber,
        yearsInBusiness: finance.businessInfo.yearsInBusiness
      },

      // Revenue
      revenue: {
        total: finance.revenue.totalRevenue,
        monthly: finance.revenue.averageMonthlyRevenue,
        lastUpdate: finance.revenue.lastRevenueUpdate
      },

      // Compliance
      kyc: finance.compliance.kycStatus,
      aml: finance.compliance.amlCheckStatus,
      accountStatus: finance.summary.accountStatus,
      riskLevel: finance.summary.riskLevel
    };

    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update payment processing info
export const updatePaymentProcessing = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const paymentData = req.body;

    let finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      finance = new Finance({
        vendor: vendorId,
        vendorType: req.body.vendorType || 'hotel',
        paymentProcessing: paymentData
      });
    } else {
      finance.paymentProcessing = { ...finance.paymentProcessing, ...paymentData };
    }

    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment processing information updated',
      data: finance
    });
  } catch (error) {
    console.error('Error updating payment processing:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update compliance information
export const updateCompliance = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const complianceData = req.body;

    let finance = await Finance.findOne({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance record not found'
      });
    }

    finance.compliance = { ...finance.compliance, ...complianceData };
    finance.compliance.lastComplianceCheck = new Date();

    await finance.save();

    res.status(200).json({
      status: 'success',
      message: 'Compliance information updated',
      data: finance
    });
  } catch (error) {
    console.error('Error updating compliance:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete finance record
export const deleteFinanceRecord = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const finance = await Finance.findOneAndDelete({ vendor: vendorId });

    if (!finance) {
      return res.status(404).json({
        status: 'error',
        message: 'Finance record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Finance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting finance record:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
