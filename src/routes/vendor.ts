import { Router } from 'express';

const vendorRouter = Router();

vendorRouter.get('/', (req, res) => {
  res.send('Vendor route');
});

vendorRouter.post('/', (req, res) => {
  res.send('Vendor created');
});

vendorRouter.put('/:id', (req, res) => {
  res.send(`Vendor with ID ${req.params.id} updated`);
});

vendorRouter.delete('/:id', (req, res) => {
  res.send(`Vendor with ID ${req.params.id} deleted`);
});

export default vendorRouter;