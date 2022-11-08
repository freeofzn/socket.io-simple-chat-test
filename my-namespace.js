module.exports = (nsp1) => {
  nsp1.on("connection", (socket) => {
    /**
     * on connection
     * @param
     * @return
     */
    connectProcess();

    async function connectProcess() {
      socket.data.nickName = "guest#";
      socket.data.roomId = "waitRoom#";
      socket.data.roomName = "waitRoom#";

      emitAllUserList();
    }

    /**
     * on login
     * @param tempLoginId : temp login id
     * @return
     */
    socket.on("login", (tempLoginId) => {
      loginProcess(tempLoginId);
    });

    async function loginProcess(tempLoginId) {
      // check dup
      const sockets = await nsp1.fetchSockets();
      for (const _socket of sockets) {
        if (tempLoginId === _socket.data.nickName) {
          nsp1.emit("login", { isLogin: false, errMsg: "DUP_LOGIN_ID", nickName: tempLoginId });
          return;
        }
      }

      // ok - no dup
      socket.data.nickName = tempLoginId;

      nsp1.emit("login", {
        isLogin: true,
        errMsg: "LOGIN_OK",
        nickName: socket.data.nickName,
        roomId: socket.data.roomId,
        roomName: socket.data.roomName,
      });

      emitAllUserList();
    }

    /**
     * on join room
     * @param
     * @return
     */
    socket.on("join room", (msg) => {
      let leaveRoomId, joinRoomId;

      //1. leave before room

      if (socket.data.roomId !== undefined) {
        leaveRoomId = socket.data.roomId;
        socket.leave(leaveRoomId);
      }

      // 2. join after room

      joinRoomId = msg.roomId;
      joinRoomName = msg.roomName;
      socket.join(joinRoomId);
      socket.data.roomId = joinRoomId;
      socket.data.roomName = joinRoomName;

      joinRoomProcess(socket.data.nickName, leaveRoomId, joinRoomId);
    });

    async function joinRoomProcess(nickName, leaveRoomId, joinRoomId) {
      if (leaveRoomId !== joinRoomId) {
        emitLeaveRoomMsg(nickName, leaveRoomId);
      }
      emitJoinRoomMsg(nickName, joinRoomId);
      emitAllUserList();
    }

    /**
     * on chat
     * @param
     * @return
     */
    socket.on("chat message", (msg) => {
      nsp1.to(msg.roomId).emit("chat message", { type: "chat msg", nickName: socket.data.nickName, msg: msg.chatMsg });
    });

    /**
     * on disconnect
     * @param
     * @return
     */
    socket.on("disconnect", () => {
      let leaveRoomId = socket.data.roomId;
      let nickName = socket.data.nickName;
      disconnectProcess(leaveRoomId, nickName);
    });

    async function disconnectProcess(leaveRoomId, nickName) {
      emitLeaveRoomMsg(nickName, leaveRoomId);
      emitAllUserList();
    }

    /**
     * emit all user list
     * @param
     * @return
     */
    async function emitAllUserList() {
      const allUserList = [];
      const allUserSockets = await nsp1.fetchSockets();
      for (const _socket of allUserSockets) {
        allUserList.push({ roomId: _socket.data.roomId, roomName: _socket.data.roomName, nickName: _socket.data.nickName });
      }
      nsp1.emit("all user list", { allUserList });
    }

    /**
     * emit join room message
     * @param
     * @return
     */
    async function emitJoinRoomMsg(nickName, joinRoomId) {
      const joinRoomSockets = await nsp1.in(joinRoomId).fetchSockets();
      const joinRoomuserList = [];
      for (const _socket of joinRoomSockets) {
        joinRoomuserList.push({ nickName: _socket.data.nickName });
      }
      nsp1.to(joinRoomId).emit("chat message", { type: "join room", nickName, roomUserList: joinRoomuserList });
    }

    /**
     * emit leave room message
     * @param
     * @return
     */
    async function emitLeaveRoomMsg(nickName, leaveRoomId) {
      const leaveRoomSockets = await nsp1.in(leaveRoomId).fetchSockets();
      const leaveRoomUserList = [];
      for (const _socket of leaveRoomSockets) {
        leaveRoomUserList.push({ nickName: _socket.data.nickName });
      }
      nsp1.to(leaveRoomId).emit("chat message", { type: "leave room", nickName, roomUserList: leaveRoomUserList });
    }
  });
};
