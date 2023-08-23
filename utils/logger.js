class Logger {
    static log(action, message) {
      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}, ${action}] ${message}`);
    }
    static error(action, message) {
      const timestamp = new Date().toLocaleString();
      console.error(`[${timestamp}, ${action}] ${message}`);
    }
}
  
export default Logger;