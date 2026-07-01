import router from 'express';

const workRequirementsRouter = router.Router();

workRequirementsRouter.get('/work-requirements', (req, res) => {
  res.send('Work Requirements route');
});

workRequirementsRouter.post('/work-requirements', (req, res) => {
  res.send('Work Requirement created');
});

workRequirementsRouter.put('/work-requirements/:id', (req, res) => {
  res.send(`Work Requirement with ID ${req.params.id} updated`);
});

workRequirementsRouter.delete('/work-requirements/:id', (req, res) => {
  res.send(`Work Requirement with ID ${req.params.id} deleted`);
});

export default workRequirementsRouter;