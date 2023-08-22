class Logger {
    static log(action, message) {
      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}, ${action}] ${message}`);
    }
}
  
export default Logger;