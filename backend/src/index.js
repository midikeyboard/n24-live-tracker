const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const timingFeed = require('./services/timingFeed');
const engine = require('./services/engine');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('N24 Live Tracker Backend is running.');
});

// Start the mock timing feed
timingFeed.start();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial state if needed
  socket.emit('initial_state', timingFeed.getCarStates());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// High-frequency telemetry broadcast loop
setInterval(() => {
  const positions = engine.getInterpolatedPositions();
  io.emit('telemetry', positions);
}, 200); // 5Hz update rate

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
