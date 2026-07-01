import { Router } from 'express';
import {
  getAllVendorDocuments,
  getVendorDocumentById,
  createVendorDocument,
  updateVendorDocument,
  deleteVendorDocument,
} from '../services/vendor-documents.js';

const vendorDocumentsRouter = Router();

vendorDocumentsRouter.get('/', getAllVendorDocuments);
vendorDocumentsRouter.get('/:id', getVendorDocumentById);
vendorDocumentsRouter.post('/', createVendorDocument);
vendorDocumentsRouter.put('/:id', updateVendorDocument);
vendorDocumentsRouter.delete('/:id', deleteVendorDocument);

export default vendorDocumentsRouter;