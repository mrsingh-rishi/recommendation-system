import router from 'express';

const vendorRouter = router.Router();

vendorRouter.get('/vendor', (req, res) => {
  res.send('Vendor route');
});

vendorRouter.post('/vendor', (req, res) => {
  res.send('Vendor created');
});

vendorRouter.put('/vendor/:id', (req, res) => {
  res.send(`Vendor with ID ${req.params.id} updated`);
});

vendorRouter.delete('/vendor/:id', (req, res) => {
  res.send(`Vendor with ID ${req.params.id} deleted`);
});

export default vendorRouter;