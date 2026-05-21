import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice
} from '../controllers/invoicesController.js';

const router = express.Router({ mergeParams: true });

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice by ID
router.get('/:id', getInvoiceById);

// POST create invoice
router.post('/', createInvoice);

// PUT update invoice
router.put('/:id', updateInvoice);

// PUT update invoice status
router.put('/:id/status', updateInvoiceStatus);

// DELETE invoice
router.delete('/:id', deleteInvoice);

export default router;
