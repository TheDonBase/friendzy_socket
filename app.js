import { WebSocketServer, WebSocket } from 'ws';
import { registerConnection, deleteConnection, getDeviceUUID } from './utils/api_client.js';
import Logger from './utils/logger.js';


function heartbeat() {
    this.isAlive = true;
}


const api_url = 'https://croaztek.com/api/websocket_connections';
const wss = new WebSocketServer({ 
  port: 8080, 
  noServer: true
});

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

// Function to add a client to the clientMap
function addClient(uuid, connection) {
    clientMap.set(uuid, { uuid, connection });
}

// Function to remove a client from the clientMap
function removeClient(uuid) {
    clientMap.delete(uuid);
}
// Function to get a client from the clientMap
function getClient(uuid) {
  return clientMap.get(uuid);
}

const removeConnection = async (uuid) => {
  const postData = {
    "uuid": uuid,
  }
  const response = await deleteConnection(`${api_url}/delete_by_uuid`, postData);
  Logger.log("Deleted Connection", `${response}`)
}

const getUuid = async (token, user) => {
  Logger.log("getUuid", "Sending get request.");
  const response = await getDeviceUUID(`https://croaztek.com/api/device_infos?User=${user}`, token);
  return response;
}

const authenticate = async (token, user, ws) => {
  try {
    Logger.log("Authenticating", "Attempting to get UUID");
    const device = await getUuid(token, user);
    addClient(device, ws);
    addConnection(device, user);
    Logger.log("New Connection", `A new User: ${user} connected with UUID: ${device}`);
  } catch (error) {
    Logger.error("authenticate Error", error);
  }
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
      await authenticate(messageData.jwtToken, messageData.user, ws);
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
    if(messageData.user !== null || messageData.friend !== null) {
      const user = messageData.user;
      const friend = messageData.friend
      const checkUser = await getUser(friend);
      const jsonData = {
        "notification_type": "friendship_add_new",
        "sender": user,
        "message": "Has Added you!"
      };
      const encodedData = JSON.stringify(jsonData);
      await broadcastToClient(checkUser, encodedData);
    }
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
        if (value.connection === ws) {
            closedUuid = key;
        }
    });

      if (closedUuid !== null) {
        // Remove the client (UUID and WebSocket connection) from the clientMap
        clientMap.delete(closedUuid);

        // Perform any additional cleanup if needed
        await removeConnection(closedUuid);

        Logger.log("Client Disconnect", `A client with UUID ${closedUuid} disconnected.`);
      } else {
            Logger.log("Client Disconnect", `A client disconnected, but UUID was not found.`);
      }
      clearInterval(interval);
    });
  
    ws.send("ping");
  });

  wss.on('listening', () => {
    const serverAddress = wss._server.address();
    if (serverAddress) {
        const { address, port } = serverAddress;
        Logger.log("Server Status", `WebSocket server is running on IP address ${address}, port ${port}`);
    } else {
        Logger.log("Server Status", "WebSocket server is running, but IP address and port information is not available.");
    }
});

Logger.log("Server Status", "WebSocket server is starting...");
