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
import squareRouter from "./square";
import corporateRouter from "./corporate";
import invoicesRouter from "./invoices";
import configRouter from "./config";
import financeRouter from "./finance";
import driverRouter from "./driver";

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
router.use(squareRouter);
router.use(corporateRouter);
router.use(invoicesRouter);
router.use(configRouter);
router.use(financeRouter);
router.use(driverRouter);

export default router;
