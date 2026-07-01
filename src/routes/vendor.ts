import { Router } from 'express';
import { createVendor, deleteVendor, getAllVendors, getVendorById, updateVendor } from '../services/vendor.js';

const vendorRouter = Router();

vendorRouter.get('/', getAllVendors);

vendorRouter.get('/:id', getVendorById);

vendorRouter.post('/', createVendor);

vendorRouter.put('/:id', updateVendor);

vendorRouter.delete('/:id', deleteVendor);

export default vendorRouter;