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

export { registerConnection, deleteConnection };