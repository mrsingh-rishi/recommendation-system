import { Router } from 'express';
import {
  getAllVendorRatings,
  createVendorRating,
  updateVendorRating,
  deleteVendorRating,
} from '../services/vendor-ratings.js';

const vendorRatingsRouter = Router();

vendorRatingsRouter.get('/', getAllVendorRatings);
vendorRatingsRouter.post('/', createVendorRating);
vendorRatingsRouter.put('/:id', updateVendorRating);
vendorRatingsRouter.delete('/:id', deleteVendorRating);

export default vendorRatingsRouter;