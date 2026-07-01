import { Router } from 'express';

const vendorRatingsRouter = Router();

vendorRatingsRouter.get('/', (req, res) => {
  res.send('Vendor Ratings route');
});

vendorRatingsRouter.post('/', (req, res) => {
  res.send('Vendor Rating created');
});

vendorRatingsRouter.put('/:id', (req, res) => {
  res.send(`Vendor Rating with ID ${req.params.id} updated`);
});
    
vendorRatingsRouter.delete('/:id', (req, res) => {
  res.send(`Vendor Rating with ID ${req.params.id} deleted`);
});

export default vendorRatingsRouter;