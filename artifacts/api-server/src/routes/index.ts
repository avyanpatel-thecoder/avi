import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import aviRouter from "./avi/index";
import supportRouter from "./support/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(aviRouter);
router.use(supportRouter);

export default router;
