import { Router } from "express";
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  requireAuth,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.get("/me", requireAuth, meHandler);
authRouter.post("/password", requireAuth, changePasswordHandler);
