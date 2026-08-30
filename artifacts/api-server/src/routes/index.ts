import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import aviRouter from "./avi/index";
import supportRouter from "./support/index";
import accountRouter from "./account/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(aviRouter);
router.use(supportRouter);
router.use(accountRouter);

export default router;
