import axios from 'axios';
import Logger from './logger.js';


async function registerConnection(url, data) {
    try {
        const response = await axios.post(url, data);
        if(response.status === 200) {
            return `${response.status} ${response.statusText}`;
        } else {
            return `${response.status} ${response.statusText}`;
        }
    } catch (error) {
        Logger.log(error);
    }
}

async function deleteConnection(url, data) {
    try {
        const response = await axios.post(url, data);
        if(response.status === 200) {
            return `${response.status} ${response.statusText}`;
        } else {
            return `${response.status} ${response.statusText}`;
        }
    } catch (error) {
        console.error(error);
    }
}

async function getDeviceUUID(url, token) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
        const response = await axios.get(url, {
            headers: headers,
        });

        // Check if 'hydra:member' exists and has at least one item
        if (response.data['hydra:member'] && response.data['hydra:member'].length > 0) {
            // Return the uuid from the first member
            Logger.log("getDeviceUUID", "Retrieved UUID Successfully!");
            return response.data['hydra:member'][0].uuid;
        } else {
            // Return null if 'hydra:member' is empty or undefined
            Logger.error("getDeviceUUID", "Failed to retrieve UUID!");
            return null;
        }
    } catch (error) {
        // Handle errors here
        console.error(error);
        throw error; // Re-throw the error to propagate it up if needed
    }
}

export { registerConnection, deleteConnection, getDeviceUUID };