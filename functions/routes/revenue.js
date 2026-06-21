import express from 'express';
import {
  getAllTransactions,
  getRevenueStats,
  getIncomeReport,
  sendIncomeReport,
  createTransaction,
  updateTransactionStatus,
  getTransactionById,
  deleteTransaction
} from '../controllers/revenueController.js';

const router = express.Router({ mergeParams: true });

// Get all transactions
router.get('/', getAllTransactions);

// Get revenue statistics
router.get('/stats', getRevenueStats);

// Get printable income report data
router.get('/report', getIncomeReport);

// Send income report email
router.post('/report/email', sendIncomeReport);

// Create new transaction
router.post('/', createTransaction);

// Get transaction by ID
router.get('/:id', getTransactionById);

// Update transaction status
router.put('/:id/status', updateTransactionStatus);

// Delete transaction
router.delete('/:id', deleteTransaction);

export default router;
