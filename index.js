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
  Logger.log("broadcastToClient", `Client: ${client.key} and message: ${message}`);
  if(client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(message);
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

const authenticate = async (token, ws) => {
  const uuid = await getUuid(jwtToken);
  clientMap.set(uuid, { device, ws });
  addConnection(uuid, device);
  Logger.log("New Connection", `A new User: ${device} connected with UUID: ${uuid}`);
}

function getUser(user) {
  let foundUser = null;

  clientMap.forEach((value, key) => {
    if (value.user === user) {
      foundUser = { key, ...value };
      Logger.log("Found User", `Found the user: ${foundUser.key}`);
    }
  });

  return foundUser;
}

async function handleMessage(ws, data) {
  const messageData = JSON.parse(data);

  if (messageData.to && clientMap.has(messageData.to)) {
      // Handle direct messages
      const recipient = clientMap.get(messageData.to);
      await sendMessageToClient(recipient, JSON.stringify({ from: 'Server', message: messageData.message }));
  } else if (messageData.type === "authenticate") {
      // Handle authentication messages
      await authenticate(messageData.jwtToken, ws);
  } else if(messageData.type === "user_date_new") {
    if(messageData.user !== null || messageData.friend !== null) {
      const user = messageData.user;
      const friend = messageData.friend
      const checkUser = await getUser(friend);
      const jsonData = {
        "notification_type": "user_date_new",
        "sender": user,
        "message": "Has sent you a new date!"
      };
      const encodedData = JSON.stringify(jsonData);
      await broadcastToClient(checkUser, encodedData);
    }
  } else if(messageData.type === "friendship_add_new") {
    
  } else {
      // Handle other message types (e.g., broadcasting)
      broadcast(data);
  }
}

wss.on('connection', function connection(ws) {
    clients.push(ws);
    Logger.log("New Connection", `A new client connected anonymously`);

    ws.isAlive = true;
    ws.on('pong', heartbeat);
  
    ws.on('error', console.error);
  
    ws.on('message', function message(data) {
      Logger.log("Incoming Message", `Received: ${data}`);
    handleMessage(ws, data);
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