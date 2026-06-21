import express from 'express';
import {
  getFinanceDetails,
  createFinanceRecord,
  updateBankDetails,
  updateTaxDetails,
  updateBusinessInfo,
  getRevenueData,
  addMonthlyRevenue,
  getFinancialSummary,
  updatePaymentProcessing,
  updateCompliance,
  deleteFinanceRecord
} from '../controllers/financeController.js';

const router = express.Router({ mergeParams: true });

// Get finance details and summary
router.get('/:vendorId', getFinanceDetails);
router.get('/:vendorId/summary', getFinancialSummary);
router.get('/:vendorId/revenue', getRevenueData);

// Create finance record
router.post('/:vendorId', createFinanceRecord);

// Update different sections
router.put('/:vendorId/bank', updateBankDetails);
router.put('/:vendorId/tax', updateTaxDetails);
router.put('/:vendorId/business', updateBusinessInfo);
router.put('/:vendorId/payment', updatePaymentProcessing);
router.put('/:vendorId/compliance', updateCompliance);

// Revenue operations
router.post('/:vendorId/revenue/monthly', addMonthlyRevenue);

// Delete
router.delete('/:vendorId', deleteFinanceRecord);

export default router;
