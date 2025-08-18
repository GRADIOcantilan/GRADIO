const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let broadcaster;

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('join', ({ streamId, role }) => {
    socket.join(streamId);
    socket.data.streamId = streamId;
    socket.data.role = role;

    if (role === 'broadcaster') {
      broadcaster = socket.id;
      io.to(streamId).emit('status', { online: true });
    } else {
      io.to(broadcaster).emit('watcher', { viewerId: socket.id });
    }
  });

  socket.on('offer', ({ viewerId, sdp }) => {
    io.to(viewerId).emit('offer', { sdp, broadcasterId: socket.id });
  });

  socket.on('answer', ({ broadcasterId, sdp }) => {
    io.to(broadcasterId).emit('answer', { viewerId: socket.id, sdp });
  });

  socket.on('candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('candidate', { candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    if (socket.id === broadcaster) {
      io.emit('end');
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`Viewer:  http://localhost:${PORT}/viewer.html`);
});
