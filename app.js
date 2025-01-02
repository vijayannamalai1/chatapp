require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const { engine } = require('express-handlebars');
const session = require('express-session');
const User = require('./models/User');
const Message = require('./models/Message');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection
const uri = `mongodb+srv://vijayannamalai:${process.env.PASSWORD}@firstcluster.ukuflip.mongodb.net/ProductsDatabase?retryWrites=true&w=majority&appName=FirstCluster/chat-app`;
// const localUri='mongodb://localhost/chat-app'
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Set up Handlebars as the view engine
app.engine('handlebars', engine({
  extname: 'handlebars',
  defaultLayout: false,
  helpers: {
    json: (context) => JSON.stringify(context)  // Convert JavaScript object to JSON string
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Route to serve the chat UI
app.get('/', async (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login'); // Redirect to login if not logged in
  }

  try {
    // Fetch all users from the DB and convert to plain JavaScript objects using .lean()
    const users = await User.find().lean(); 

    // Filter out the logged-in user from the list
    const activeUsers = users.filter(user => user.username !== req.session.username);

    // Render the chat page with the list of users
    res.render('chat', { 
      title: 'Chat Application',
      users: activeUsers,  // Pass the filtered users list
      loggedInUser: req.session.username // Pass logged-in user's username to the template
    });
  } catch (err) {
    console.log('Error fetching users:', err);
    res.redirect('/login');
  }
});


// Route to show login form
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Route to show registration form
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// Register new user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render('register', { title: 'Register', error: 'Username already exists' });
  }

  // Create new user
  const user = new User({ username, password });
  await user.save();

  res.redirect('/login');
});

// Login a user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.render('login', { title: 'Login', error: 'Invalid username or password' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.render('login', { title: 'Login', error: 'Invalid username or password' });
  }

  req.session.username = user.username;
  res.redirect('/');
});

// Logout the user
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Load existing messages when a user connects
  Message.find().then(messages => {
    socket.emit('loadMessages', messages);
  });

  // Handle incoming messages from clients
  socket.on('chatMessage', (msg, username) => {
    // Save the message to the database with the correct username
    const message = new Message({ text: msg, username });
    message.save().then(() => {
      // Broadcast the message to all connected clients
      io.emit('chatMessage', { msg, username }); // Emit the message with the username
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const port=process.env.PORT||3000
// Start the server
server.listen(port, () => {
  console.log('Server is running on http://localhost:3000');
});
