import React, { useEffect, useState, useRef } from "react";
import "./ChatRoom.css";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { useSelector } from "react-redux";

export type message = {
  username: string;
  content: string;
};

function ChatRoom(props, ref) {

  // reducer에서 데이터 가져오기
  const {
    tourId,
    tourUID,
  } = useSelector((state) => state.liveStream);

  const [chatMessages, setChatMessages] = useState<message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [stompClient] = useState(
    Stomp.over(new SockJS("https://busanwavrserver.store/ws-stomp"))
  );

  const { accessToken, userId } = useSelector((state: any) => state.userInfo);

  // 자동 스크롤
  const messageEndRef = useRef(null);
  const scrollToBottom = () => {
    messageEndRef.current.scrollTop = messageEndRef.current.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  

  // 구독하고 메시지 받기
  useEffect(() => {
    if (stompClient != null) {
      stompClient.connect({}, () => {
        console.log("연결됨");
        stompClient.subscribe(
          `/sub/chat/message/room/${tourUID}`,
          (data) => {
            console.log("--------------------------------");
            const receivedMessage = JSON.parse(data.body);
            const newChatMessage = {
              msgType: receivedMessage.type,
              userType: receivedMessage.sender.type,
              senderId: receivedMessage.sender.id,
              username: receivedMessage.sender.nickname,
              content: receivedMessage.body,
            };
            scrollToBottom();

            console.log(receivedMessage);

            setChatMessages((prevMessages) => [
              ...prevMessages,
              newChatMessage,
            ]);
          }
        );
      });
    }
  }, []);

  // 메시지 보내기
  const handleEnter = () => {
    scrollToBottom();

    const newMessage = {
      roomUid: tourUID,
      token: accessToken,
      message: inputMessage,
    };

    stompClient.send(
      "/pub/chat/message/normal",
      {},
      JSON.stringify(newMessage)
    );
    console.log(chatMessages);
    setInputMessage("");
  };

  const handleEnterPress = (e) => {
    if (e.key === "Enter" && inputMessage) {
      handleEnter();
    }
  };

  // 채팅방 나가기
  const handleLeaveChat = () => {
    const leaveMessage = {
      roomUid: tourUID,
      token: accessToken,
    };
    stompClient.send("/pub/chat/message/leave", {}, JSON.stringify(leaveMessage));
  };

  React.useImperativeHandle(ref, () => ({
    handleLeaveChat: handleLeaveChat,
  }));

  // 채팅방 재입장
const handleJoinChat = async () => {
    try {
        const requestBody = {
            tourId: tourId,
          };

        const response = await fetch("/api/chatroom/rejoin", {
          method: "POST",
          headers: {
            Authorization: accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        if (response.status === 200) {
          const data = await response.json();
          alert(data.message);
        } else {
          console.log(data.message);
          alert(data.message);
        }
      } catch (error) {
        console.error(error);
      }
}

  return (
    <div className="chatroom-container">
      <div className="chat-card">
        <div className="chat-header">
          <div className="h2">chatroom</div>
        </div>
        <div className="chat-body" ref={messageEndRef}>
          {chatMessages.map((msg, index) => {
            switch (msg.msgType) {
              case "LEAVE":
                return (
                  <p className="leave" key={index}>{msg.username}님이 채팅방에서 퇴장했습니다.</p>
                );
              case "VOTE":
                return (
                  <p className="vote" key={index}>
                    {msg.username}님이 {msg.content}번에 투표했습니다.
                  </p>
                );
              default:
                return (
                  <div key={index}>
                    {msg.senderId == userId ? (
                      <p className="message outgoing" key={index}>
                        {msg.content}
                      </p>
                    ) : (
                      <p className="message incoming" key={index}>
                        <strong>{msg.username}</strong> | {msg.content}
                      </p>
                    )}
                  </div>
                );
            }
          })}
        </div>
        <div className="chat-footer">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleEnterPress}
            placeholder="메세지를 입력하세요."
          />
          <button onClick={handleEnter} disabled={!inputMessage}>
            send
          </button>
        </div>
        <div className="chat-footer-temp">
          <button onClick={handleLeaveChat}>
            나가기
          </button>
          <button onClick={handleJoinChat} disabled>
            재입장
          </button>
          <button disabled>
            투표하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.forwardRef(ChatRoom);
