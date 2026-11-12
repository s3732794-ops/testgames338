const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log(`Игрок подключился: ${socket.id}`);

  socket.on('find_match', (playerData) => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomName = `room_${Date.now()}`;
      const p1 = waitingPlayer;
      const p2 = socket;

      waitingPlayer = null;

      p1.join(roomName);
      p2.join(roomName);

      // Игрок 1 начинает слева, Игрок 2 тоже со своей точки зрения видит себя слева
      io.to(p1.id).emit('match_found', { room: roomName, role: 'p1', enemyData: playerData });
      io.to(p2.id).emit('match_found', { room: roomName, role: 'p2', enemyData: playerData });
      console.log(`Сетевой матч создан: ${roomName}`);
    } else {
      waitingPlayer = socket;
      socket.emit('waiting_for_opponent');
    }
  });

  socket.on('cancel_search', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });

  socket.on('spawn_unit', (data) => {
    // Пересылаем данные хода противнику в комнате
    socket.to(data.room).emit('opponent_spawn', data);
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    console.log(`Игрок отключился: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});