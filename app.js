import { WebSocketServer, WebSocket } from 'ws';
import { registerConnection, deleteConnection, getDeviceUUID } from './utils/api_client.js';
import Logger from './utils/logger.js';
import 'dotenv/config'

const api_url = 'https://croaztek.com/api/websocket_connections';

const wss = new WebSocketServer({ 
  port: process.env.SOCKET_PORT,
});

const clients = new Map();

const broadcast = (message) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const addConnection = async (uuid, user) => {
  const postData = {
    "uuid": uuid,
    "user": `/api/users/${user}`
  }
  const response = await registerConnection(api_url, postData);
  Logger.log("Added Connection", `${response}`)
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
    clients.set(ws, { user, device });
    addConnection(device, user);
    Logger.log("New Connection", `A new User: ${user} connected with UUID: ${device}`);
  } catch (error) {
    Logger.error("authenticate Error", error);
  }
}

async function handleMessage(ws, data) {
  try {
    const messageData = JSON.parse(data);

    // Check if messageData is an object
    if (typeof messageData === 'object' && messageData !== null) {
      // Access the fields in the messageData object
      const type = messageData.type;
      const jwtToken = messageData.jwtToken;
      const user = messageData.user;

      // Now you can use these fields as needed
      if (type === "authenticate") {
        // Handle authentication logic here
        authenticate(jwtToken, user, ws)
      } else {
        // Handle other message types
        Logger.log("Received message of type:", type);
      }
    } else {
      Logger.error("JSON Not Valid", `Received data is not a valid JSON object, and the data is: ${data}`);
    }
  } catch (error) {
    Logger.error("Error parsing JSON data", error);
  }
}

wss.on('connection', function connection(ws) {
  Logger.log("New Connection", `A new client connected anonymously`);

  ws.on('message', function message(data) {
    handleMessage(ws, data);
  });

  ws.on('close', async function close() {
    if (clients.has(ws)) {
      const { device } = clients.get(ws);
      clients.delete(ws);
      await removeConnection(device);
      Logger.log("Client Disconnect", `A client with UUID ${device} disconnected.`);
    } else {
      Logger.log("Client Disconnect", `A client disconnected, but UUID was not found.`);
    }
  });

  ws.send("ping");
});

Logger.log("Server Status", `WebSocket server is starting on port: ${process.env.SOCKET_PORT}`);
