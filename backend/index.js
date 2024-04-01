const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser")
const fileRoute = require("./routers/file");

const PORT = 5050;

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());

const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(socket.id);
});

app.use("/api/file", (req, res, next) => {
  req.io = io;
  next();
}, fileRoute);

httpServer.listen(PORT, () => console.log(`server is running on PORT ${PORT}`));
