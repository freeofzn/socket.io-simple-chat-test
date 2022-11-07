module.exports = (nsp1) => {
  nsp1.on("connection", (socket) => {
    console.log("connection nsp1");
    socket.data.nickName = "guest#"; // 게스트 접속
    socket.data.roomName = "waitRoom#"; // 대기실 접속
    connectProcess(); // 최초 연결시, 로그인 유저목록 전송
    /**
     * on join user
     * @param tempLoginId : temp id
     * @return
     */
    socket.on("join user", (tempLoginId) => {
      joinUserProcess(tempLoginId);
    });

    socket.on("chat message", (msg) => {
      //nsp1.emit("chat message", msg);
      console.log("chat message", msg);
      nsp1.to(msg.roomName).emit("chat message", { type: "chat msg", nickName: socket.data.nickName, msg: msg.chatMsg });
    });

    socket.on("join room", (msg) => {
      console.log("join room", msg);
      let leaveRoomName, joinRoomName;
      if (socket.data.roomName !== undefined) {
        console.log("이전방 나오기", socket.data.roomName);
        leaveRoomName = socket.data.roomName;
        socket.leave(leaveRoomName); // 이전 room 에서 나오기
      }
      joinRoomName = msg.roomName;
      socket.join(joinRoomName);
      socket.data.roomName = joinRoomName;
      joinRoomProcess(leaveRoomName, joinRoomName);
    });

    /**
     * 최초 비로그인 접속처리 - 현재 접속중인 유저목록 전송
     * @param
     * @return
     */
    async function connectProcess() {
      const sockets = await nsp1.fetchSockets();

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        loginUserList.push({ roomName: _socket.data.roomName, nickName: _socket.data.nickName });
      }
      nsp1.emit("connect user", { isLogin: false, allUserCount: nsp1.sockets.size, loginUserList });
    }

    /**
     * 로그인 처리 : 아이디 중복체크 후 없으면 로그인 처리
     * @param tempLoginId : 입력한 로그인 아이디
     * @return
     */
    async function joinUserProcess(tempLoginId) {
      const sockets = await nsp1.fetchSockets();

      // 닉네임 중복체크
      for (const _socket of sockets) {
        if (tempLoginId === _socket.data.nickName) {
          nsp1.emit("join user", { isLogin: false, errMsg: "DUP_LOGIN_ID", nickName: tempLoginId }); // 중복발생시
          return;
        }
      }

      // 중복없을때
      socket.data.nickName = tempLoginId;

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        loginUserList.push({ roomName: _socket.data.roomName, nickName: _socket.data.nickName });
      }
      nsp1.emit("join user", { isLogin: true, errMsg: "LOGIN_OK", nickName: socket.data.nickName, roomName: socket.data.roomName, allUserCount: nsp1.sockets.size, loginUserList }); // 중복없음
    }

    /**
     *
     * @param
     * @return
     */
    async function joinRoomProcess(leaveRoomName, joinRoomName) {
      const loginUserSockets = await nsp1.fetchSockets();
      const leaveRoomSockets = await nsp1.in(leaveRoomName).fetchSockets();
      const joinRoomSockets = await nsp1.in(joinRoomName).fetchSockets();
      const leaveRoomUserList = [];
      const joinRoomuserList = [];

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of loginUserSockets) {
        loginUserList.push({ roomName: _socket.data.roomName, nickName: _socket.data.nickName });
      }

      // emit leave room
      for (const _socket of leaveRoomSockets) {
        console.log("leaveRoomUserList", _socket.data);
        leaveRoomUserList.push({ nickName: _socket.data.nickName });
      }
      if (leaveRoomName !== joinRoomName) {
        nsp1.to(leaveRoomName).emit("chat message", { type: "leave room", nickName: socket.data.nickName, roomUserList: leaveRoomUserList, loginUserList });
      }

      // emit join room
      for (const _socket of joinRoomSockets) {
        console.log("joinRoomProcess", _socket.data);
        joinRoomuserList.push({ nickName: _socket.data.nickName });
      }
      nsp1.to(joinRoomName).emit("chat message", { type: "join room", nickName: socket.data.nickName, roomUserList: joinRoomuserList, loginUserList });
    }

    socket.on("disconnect", () => {
      socket.broadcast.emit("chat message", "disconnect");
      console.log("user disconnected");
    });
  });
};
