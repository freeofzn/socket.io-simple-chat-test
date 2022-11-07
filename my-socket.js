const SocketIO = require("socket.io");
const myNamespace = require("./my-namespace");

module.exports = (server) => {
  const io = SocketIO(server);
  const nsp1 = io.of("/nsp1");
  myNamespace(nsp1);
};
