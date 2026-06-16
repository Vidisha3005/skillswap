// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const http = require('http');
// const socketIo = require('socket.io');
// const path = require('path');

// // Load environment variables from backend.env
// dotenv.config({ path: path.resolve(__dirname, '.env') });

// // Verify environment variables
// console.log("PORT:", process.env.PORT);
// console.log("Mongo URI:", process.env.MONGO_URI);
// console.log("JWT_SECRET:", process.env.JWT_SECRET);
// console.log("JWT_EXPIRE:", process.env.JWT_EXPIRE);

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/users', require('./routes/users'));
// app.use('/api/matches', require('./routes/matches'));
// app.use('/api/messages', require('./routes/messages'));
// app.use('/api/appointments', require('./routes/appointments'));

// // Socket.io for real-time messaging
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join', (userId) => {
//     socket.join(userId);
//     console.log(`User ${userId} joined room`);
//   });

//   socket.on('sendMessage', (data) => {
//     io.to(data.receiverId).emit('newMessage', data);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log('MongoDB connection error:', err));

// // Basic route
// app.get('/', (req, res) => {
//   res.json({ message: 'SkillSwap API is running!' });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });



const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Log environment variables for debugging
console.log("PORT:", process.env.PORT);
console.log("Mongo URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("JWT_EXPIRE:", process.env.JWT_EXPIRE);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- ROUTES ---
// Make sure the route files exist and are named correctly
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/trends', require('./routes/trends'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/security', require('./routes/security')); // Security analysis route

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    console.error('Payload too large error:', err);
    return res.status(413).json({ success: false, message: 'File size too large. Please upload smaller files.' });
  }
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Test route for quick debugging
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth route is working!' });
});

// Socket.io for real-time messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.receiverId).emit('newMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'SkillSwap API is running!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

