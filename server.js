//SERVER SIDE ONLY!!
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require("socket.io");
const app = express();

const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

let opponent = null;

io.on('connection', (user) => {
  console.log("A user connected!");
  user.on('disconnect', () => {
    console.log("User disconnected!");
  });

  // Listen for 'createUser' event from the client
  user.on('createUser', (data) => {
    console.log('New user created:', data.username);
  });

  user.on('passUsername', (data) => {
    user.emit('userCreated', { username: data.username });
    console.log(data.page, 'received user from client:', data.username);
    user.username = data.username;
  });

  user.on('rejoinRoom', (data) => {
    user.username = data.username;
    user.roomId = data.roomId;
    user.join(data.roomId);
    console.log(`${user.username} rejoined ${user.roomId}`);
  });

  user.on('findOpponent', (data) => {
    user.username = data.username;
    if (opponent === null) {
      // No player is waiting, so this player will wait for an opponent
      opponent = user;
      user.emit('waitingForOpponent');
    } else {
      const roomId = `room_${opponent.id}`;

      //player connected to the room
      user.roomId = roomId;
      user.join(roomId);
      user.role = 'X';
      
      //opponent connected to the room
      opponent.join(roomId);
      opponent.roomId = roomId;
      opponent.role = 'O';
      
      // Notify both players that an opponent has been found
      user.emit('opponentFound', { roomId, role: user.role });
      opponent.emit('opponentFound', { roomId, role: opponent.role });

      // Log the room assignment
      console.log(`${user.username} and ${opponent.username} are in ${roomId}`);
      opponent = null;
    }
  });

  user.on('assignRole', (data) => {
    user.role = 'X';
    opponent.role = 'O';
  });

  // Listen for moves from the clients
  user.on('move', (data) => {
    console.log(data.username, "moved at cell index:", data.index);
    data.elementText = 'X'; // Example move, replace with actual game logic
    // Broadcast the move to the opponent in the same room
    user.to(user.roomId).emit('opponentMove', { move : data });
  });
});
  

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'login-client.html'));
});

app.get('/game', (req, res) => {
  username = req.query.username;
  res.sendFile(join(__dirname, 'tic-client.html'));
});

app.get('/wait', (req, res) => {
  username = req.query.username;
  res.sendFile(join(__dirname, 'waiting-client.html'));
});

server.listen(3000, () => {
  console.log('Login server running at http://localhost:3000');
});