import cors from "cors";
import express from "express";
import { config } from "./config/config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { healthRouter } from "./routes/health.router.js";

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

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Juntadita backend running on port ${config.port}`);
});
