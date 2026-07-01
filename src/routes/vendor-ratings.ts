import router from 'express';

const vendorRatingsRouter = router.Router();

vendorRatingsRouter.get('/vendor-ratings', (req, res) => {
  res.send('Vendor Ratings route');
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

export default vendorRatingsRouter;