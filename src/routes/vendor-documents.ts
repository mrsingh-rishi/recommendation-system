import { Router } from 'express';

const vendorDocumentsRouter = Router();

vendorDocumentsRouter.get('/', (req, res) => {
  res.send('Vendor Documents route');
});

vendorDocumentsRouter.post('/', (req, res) => {
  res.send('Vendor Document created');
});

vendorDocumentsRouter.put('/:id', (req, res) => {
  res.send(`Vendor Document with ID ${req.params.id} updated`);
});

vendorDocumentsRouter.delete('/:id', (req, res) => {
  res.send(`Vendor Document with ID ${req.params.id} deleted`);
});

export default vendorDocumentsRouter;