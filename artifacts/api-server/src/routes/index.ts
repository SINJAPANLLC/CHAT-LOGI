import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import shipmentsRouter from "./shipments";
import aiRouter from "./ai";
import carriersRouter from "./carriers";
import paymentsRouter from "./payments";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import pricingRouter from "./pricing";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(shipmentsRouter);
router.use(aiRouter);
router.use(carriersRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(pricingRouter);
router.use(usersRouter);

export default router;
