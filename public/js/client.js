// Frontend (client.js)

// Connect to the Socket.io server
const socket = io();

// Get elements from the DOM
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const messagesContainer = document.getElementById('messages');

// Get the username from the logged-in user (this should be dynamically passed by the server)
const username = "{{loggedInUser}}";  // Dynamic username passed from the server

// Send the message to the server when the button is clicked
sendMessageBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  
  if (message) {
    socket.emit('chatMessage', message, username);  // Emit message to the server along with username
    messageInput.value = '';  // Clear the input field
  }
});

// Listen for incoming messages from the server and display them in the chat box
socket.on('chatMessage', ({ msg, username }) => {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.textContent = `${username}: ${msg}`;  // Show the username with the message
  messagesContainer.appendChild(messageElement);
});

// Optionally, load previous messages when the user connects
socket.on('loadMessages', (messages) => {
  messages.forEach(({ text, username }) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = `${username}: ${text}`;  // Show the username with the message
    messagesContainer.appendChild(messageElement);
  });
});
