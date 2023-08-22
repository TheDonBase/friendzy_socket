import { WebSocketServer, WebSocket } from 'ws';
import generateUUID from './utils/generateUUID.js';
import { registerConnection, deleteConnection } from './utils/api_client.js';
import Logger from './utils/logger.js';


function heartbeat() {
    this.isAlive = true;
}


const ws_port = 443;
const api_url = 'https://croaztek.com/api/websocket_connections';
const wss = new WebSocketServer({ port: ws_port });

const clients = [];
const clientMap = new Map();

const broadcast = (message) => {
  clients.forEach((client) => {
    if(client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastToClient = (client, message) => {
  if(client.readyState === WebSocket.OPEN) {
    client.send(message);
  }
};

const addConnection = async (uuid, user) => {
  const postData = {
    "uuid": uuid,
    "user": `/api/users/${user}`
  }
  const response = await registerConnection(api_url, postData);
  Logger.log("Added Connection",`${response}`)
}

const removeConnection = async (uuid) => {
  const postData = {
    "uuid": uuid,
  }
  const response = await deleteConnection(`${api_url}/delete_by_uuid`, postData);
  Logger.log("Deleted Connection", `${response}`)
}

const authenticate = (user, ws) => {
  const uuid = generateUUID();
  clientMap.set(uuid, { user, ws });
  addConnection(uuid, user);
  Logger.log("New Connection", `A new User: ${user} connected with UUID: ${uuid}`);
}

wss.on('connection', function connection(ws) {
    clients.push(ws);
    Logger.log("New Connection", `A new client connected anonymously`);

    ws.isAlive = true;
    ws.on('pong', heartbeat);
  
    ws.on('error', console.error);
  
    ws.on('message', function message(data) {
      Logger.log("Incomming Message",`Received: ${data}`);

      const messageData = JSON.parse(data);
      if (messageData.to && clientMap.has(messageData.to)) {
        const recipient = clientMap.get(messageData.to);
        sendMessageToClient(recipient, JSON.stringify({ from: 'Server', message: messageData.message }));
      } else if (messageData.type === "authenticate") {
        authenticate(messageData.user, ws);
      } else {
        // Broadcast the message to all clients
        broadcast(message);
      }
    });
  
    const interval = setInterval(function ping() {
      wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
  
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  
    ws.on('close', async function close() {
      clients.splice(clients.indexOf(ws), 1); // Remove ws from clients

      // Find the UUID associated with the closing WebSocket (ws)
      let closedUuid = null;
      clientMap.forEach((value, key) => {
        if (value.ws === ws) {
          closedUuid = key;
        }
      });

      if (closedUuid !== null) {
        clientMap.delete(closedUuid); // Delete using the found UUID
        await removeConnection(closedUuid);
        Logger.log("Client Disconnect", `A client with UUID ${closedUuid} disconnected.`);
      } else {
        Logger.log("Client Disconnect", `A client disconnected, but UUID was not found.`);
      }

      clearInterval(interval);
    });
  
    ws.send("ping");
  });

  Logger.log("Server Status" ,`WebSocket server is running on port ${ws_port}`);