import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import aviRouter from "./avi/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(aviRouter);

export default router;
