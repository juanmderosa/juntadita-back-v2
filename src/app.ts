import cors from "cors";
import express from "express";
import { config } from "./config/config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { healthRouter } from "./routes/health.router.js";
import { usersRouter } from "./routes/users.router.js";
import { eventsRouter } from "./routes/events.router.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/v1", usersRouter);
app.use("/api/v1/events", eventsRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Juntadita backend running on port ${config.port}`);
});
