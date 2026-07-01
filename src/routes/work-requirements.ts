import { Router } from 'express';

import {
  getAllWorkRequirements,
  getWorkRequirementById,
  createWorkRequirement,
  updateWorkRequirement,
  deleteWorkRequirement,
} from '../services/work-requirements.js';

const workRequirementsRouter = Router();

workRequirementsRouter.get('/', getAllWorkRequirements);
workRequirementsRouter.get('/:id', getWorkRequirementById);
workRequirementsRouter.post('/', createWorkRequirement);
workRequirementsRouter.put('/:id', updateWorkRequirement);
workRequirementsRouter.delete('/:id', deleteWorkRequirement);

export default workRequirementsRouter;