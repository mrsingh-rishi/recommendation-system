import { Router } from "express";
import { getRecommendations } from "../services/recommendations.js";

const recommendationsRouter = Router();

recommendationsRouter.get("/", getRecommendations);

export default recommendationsRouter;
