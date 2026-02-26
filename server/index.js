import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from 'cors' 
import connectDB from "./src/utils/db.js";
import { initSocket } from "./src/utils/socket.js";
import userRouter from "./src/users/routes/userLoginRoutes.js";
import tenantRouter from "./src/tenant/routes/tenantRoutes.js";
import createUserRouter from "./src/users/routes/createUserRoutes.js";
import outletRouter from "./src/outlet/core/routes/outletRoutes.js";
import itemRouter from "./src/items/routes/itemRoutes.js";
import kioskRouter from "./src/outlet/kiosk/routes/kioskRoutes.js";
import orderRouter from "./src/outlet/orders/routes/orderRoutes.js";
import kitchenRouter from "./src/outlet/kitchen/routes/kitchenRoutes.js";
import displayRouter from "./src/outlet/display/routes/displayRoutes.js";
import analyticsRouter from "./src/outlet/analytics/routes/analyticsRoutes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8000; 

connectDB();
initSocket(httpServer);

app.use(cors({
  origin: [process.env.CORS_ORIGIN, "http://localhost:5173"], 
  credentials: true,
}));

app.use(express.json()); 


app.use('/api/v1/users' ,userRouter );
app.use('/api/v1/tenants', tenantRouter);
app.use('/api/v1/users', createUserRouter);
app.use('/api/v1/outlets', outletRouter);
app.use('/api/v1/items', itemRouter);
app.use('/api/v1/kiosks', kioskRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/kitchen', kitchenRouter);
app.use('/api/v1/displays', displayRouter);
app.use('/api/v1/analytics', analyticsRouter);

// error handling middleware at last :
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    const response = {
        success: false,
        message: err.message || 'Internal Server Error',
    };

    res.status(statusCode).json(response);

    console.error(err.stack);
});


httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
