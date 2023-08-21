import { WebSocketServer, WebSocket } from 'ws';


function heartbeat() {
    this.isAlive = true;
}

function sendUserDateNotification(sender) {
    const dataToSend = {
        message: "Has sent you a new user date!",
        sender: sender
      };

      clients.forEach((client) => {
        // Check if the client connection is still open
        if (client.connection.readyState === WebSocket.OPEN) {
          client.connection.send(JSON.stringify(dataToSend));
        }
      });
}

const ws_port = 443;
const wss = new WebSocketServer({ port: ws_port });

const clients = [];

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
  
    ws.on('error', console.error);
  
    ws.on('message', function message(data) {
      console.log(`received: ${data.toString()}`);
  
      // Parse the received JSON message
      try {
        const messageObject = JSON.parse(data);
  
        // Check if the "type" field is "authenticate"
        if (messageObject.type === "authenticate") {
          // Assuming the user's display name is stored in the "user" field
          const displayName = messageObject.user;
  
          // Add the user to the client list
          clients.push({ name: displayName, connection: ws });
  
          // Log that the user has been added
          console.log(`User ${displayName} has been added to the client list.`);
        }
      } catch (error) {
        // Handle JSON parsing errors
        console.error(`Error parsing JSON: ${error}`);
      }
    });
  
    const interval = setInterval(function ping() {
      wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
  
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  
    ws.on('close', function close() {
      // Find the disconnected connection in the clients array and remove it
      const index = clients.findIndex((client) => client.connection === ws);
      if (index !== -1) {
        const disconnectedClient = clients.splice(index, 1)[0];
        console.log(`${disconnectedClient.name} disconnected.`);
        clearInterval(interval);
      }
    });
  
    ws.send("Ping");
  });