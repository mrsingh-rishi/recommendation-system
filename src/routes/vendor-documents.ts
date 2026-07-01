import router from 'express';
import vendorRatingsRouter from './vendor-ratings.js';

const vendorDocumentsRouter = router.Router();

vendorDocumentsRouter.get('/vendor-documents', (req, res) => {
  res.send('Vendor Documents route');
});

vendorRatingsRouter.post('/vendor-ratings', (req, res) => {
  res.send('Vendor Rating created');
});

vendorRatingsRouter.put('/vendor-ratings/:id', (req, res) => {
  res.send(`Vendor Rating with ID ${req.params.id} updated`);
});

vendorRatingsRouter.delete('/vendor-ratings/:id', (req, res) => {
  res.send(`Vendor Rating with ID ${req.params.id} deleted`);
});

export default vendorDocumentsRouter;