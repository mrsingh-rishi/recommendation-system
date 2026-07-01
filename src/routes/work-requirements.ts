import { Router } from 'express';

const workRequirementsRouter = Router();

workRequirementsRouter.get('/', (req, res) => {
  res.send('Work Requirements route');
});

workRequirementsRouter.post('/', (req, res) => {
  res.send('Work Requirement created');
});

workRequirementsRouter.put('/:id', (req, res) => {
  res.send(`Work Requirement with ID ${req.params.id} updated`);
});

workRequirementsRouter.delete('/:id', (req, res) => {
  res.send(`Work Requirement with ID ${req.params.id} deleted`);
});

export default workRequirementsRouter;