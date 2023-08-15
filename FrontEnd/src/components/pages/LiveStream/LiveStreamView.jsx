import { OpenVidu } from "openvidu-browser";
import axios from "axios";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { Input, Button, ButtonGroup } from "@nextui-org/react";
import React, {
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FullScreen, useFullScreenHandle } from "react-full-screen";

import UserVideoContainer from "./UserVideoContainer";
import Toolbar from "./Toolbar";
import LiveExample from "./LiveExample";
import Loader from "../../atoms/Loader";
import useCustomBack from "../../../hooks/useCustomBack";
import ChatRoom from "./ChatRoom";
import QRCodeComponent from "./QRCodeComponent";
import VoteModal from "./VoteModal";

import "./LiveStreamView.css";
import TestTest from "../Test/TestTest";
import Stt from "../Test/Stt";

import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";

import { useSelector, useDispatch } from "react-redux";
import {
  setIsAudioEnabled,
  setIsVideoEnabled,
  setIsFullScreen,
  setIsChatOpen,
  setIsVoteOpen,
  setStompClient,
  setOption1,
  setOption2,
  setOption1Cnt,
  setOption2Cnt,
} from "./LiveStreamReducer";

const APPLICATION_SERVER_URL = "https://busanopenvidu.store/api/v1/openvidu";

const LiveStreamView = () => {
  const navigate = useNavigate();

  const {
    youtubeLink,
    isAudioEnabled,
    isVideoEnabled,
    isFullScreen,
    isChatOpen,
    isVoteOpen,
    tourId,
    // tourUID,
    stompClient,
    option1,
    option2,
    option1Cnt,
    option2Cnt,
  } = useSelector((state) => state.liveStream);

  const { nickname, userType } = useSelector((state) => state.userInfo);
  const dispatch = useDispatch();

  // 그냥 모든 sessionid => tourId로 바꿔주면 되는데 무서워서 일단 이렇게
  // const sessionid = tourId 로 하니까 채팅은 되는데 오픈비두가 안됨..
  const { sessionid } = useParams();
  const tourUID = sessionid;

  // 가이드가 투표를 열어서, 현재 투표가 진행중인지
  const [vote, setVote] = useState(false);
  // 사용자가 모션인식으로 투표를 진행중인지
  const [voting, setVoting] = useState(false);
  // 가이드가 입력할 투표 항목
  const [column1, setColumn1] = useState("");
  const [column2, setColumn2] = useState("");

  const [session, setSession] = useState(undefined);
  const [mainStreamManager, setMainStreamManager] = useState(undefined);
  const [publisher, setPublisher] = useState(undefined);
  const [subscribers, setSubscribers] = useState([]);
  const [currentVideoDevice, setCurrentVideoDevice] = useState(null);
  const [onload, setOnload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [onConnect, setOnConnect] = useState(false);

  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 1,
  };

  // accessToken
  const accessToken = localStorage.getItem("accessToken");

  const OV = useRef(new OpenVidu());

  const handleMainVideoStream = useCallback(
    (stream) => {
      if (mainStreamManager !== stream) {
        setMainStreamManager(stream);
      }
    },
    [mainStreamManager]
  );

  const extractVideoIdFromLink = (link) => {
    const regex = /(?:\?v=)([^&]+)/;
    const match = link.match(regex);
    return match ? match[1] : null;
  };

  const videoId = extractVideoIdFromLink(youtubeLink);

  useEffect(() => {
    dispatch(
      setStompClient(
        Stomp.over(new SockJS("https://busanwavrserver.store/ws-stomp"))
      )
    );
  }, [dispatch]);

  useEffect(() => {
    if (stompClient) {
      stompClient.connect({}, () => {
        console.log("연결됨");
        setOnConnect(true);
        subscribeVote(stompClient);
        subscribeVoteCnt(stompClient);
        subscribeEndVote(stompClient);
      });
    }
  }, [stompClient]);

  useEffect(() => {
    const mySession = OV.current.initSession();

    const handleStreamCreated = (event) => {
      const subscriber = mySession.subscribe(event.stream, undefined);
      setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
    };

    const handleStreamDestroyed = (event) => {
      deleteSubscriber(event.stream.streamManager);
    };

    const handleException = (exception) => {
      console.warn(exception);
    };

    mySession.on("streamCreated", handleStreamCreated);
    mySession.on("streamDestroyed", handleStreamDestroyed);
    mySession.on("exception", handleException);

    setSession(mySession);
    setOnload(true);

    return () => {
      // 컴포넌트가 언마운트될 때 이벤트 리스너를 해제하고 subscribers를 초기화
      mySession.off("streamCreated", handleStreamCreated);
      mySession.off("streamDestroyed", handleStreamDestroyed);
      mySession.off("exception", handleException);
      mySession.disconnect();
      setSubscribers([]);
    };
  }, []);

  useEffect(() => {
    if (session) {
      // Get a token from the OpenVidu deployment
      getToken().then(async (token) => {
        try {
          console.log(token);
          await session.connect(token, { clientData: nickname });

          let publisher = await OV.current.initPublisherAsync(undefined, {
            audioSource: undefined,
            videoSource: undefined,
            publishAudio: isAudioEnabled,
            publishVideo: isVideoEnabled,
            resolution: "640x480",
            frameRate: 30,
            insertMode: "APPEND",
            mirror: false,
          });

          session.publish(publisher);

          const devices = await OV.current.getDevices();
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );
          const currentVideoDeviceId = publisher.stream
            .getMediaStream()
            .getVideoTracks()[0]
            .getSettings().deviceId;
          const currentVideoDevice = videoDevices.find(
            (device) => device.deviceId === currentVideoDeviceId
          );
          setMainStreamManager(publisher);
          setPublisher(publisher);
          setCurrentVideoDevice(currentVideoDevice);

          setIsLoading(false);
        } catch (error) {
          console.log(
            "There was an error connecting to the session:",
            error.code,
            error.message
          );
        }
      });
    }
  }, [session, nickname, sessionid]);

  // 라이브 종료
  const leaveSession = useCallback(async () => {
    // Leave the session
    if (session) {
      session.disconnect();
    }

    onLeaveChat();

    navigate("/livestream");
  }, [session]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      leaveSession();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useCustomBack(leaveSession);

  // 카메라 전환
  const switchVideo = useCallback(async () => {
    try {
      const devices = await OV.current.getDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices && videoDevices.length > 1) {
        const newVideoDevice = videoDevices.filter(
          (device) => device.deviceId !== currentVideoDevice.deviceId
        );

        if (newVideoDevice.length > 0) {
          const newPublisher = OV.current.initPublisher(undefined, {
            videoSource: newVideoDevice[0].deviceId,
            publishAudio: isAudioEnabled,
            publishVideo: isVideoEnabled,
            mirror: true,
          });

          if (session) {
            await session.unpublish(mainStreamManager);
            await session.publish(newPublisher);
            setCurrentVideoDevice(newVideoDevice[0]);
            setMainStreamManager(newPublisher);
            setPublisher(newPublisher);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentVideoDevice, session, mainStreamManager]);

  // subscriber 삭제
  const deleteSubscriber = useCallback((streamManager) => {
    setSubscribers((prevSubscribers) => {
      const index = prevSubscribers.indexOf(streamManager);
      if (index > -1) {
        const newSubscribers = [...prevSubscribers];
        newSubscribers.splice(index, 1);
        return newSubscribers;
      } else {
        return prevSubscribers;
      }
    });
  }, []);

  // 카메라 온오프
  const toggleVideo = () => {
    dispatch(setIsVideoEnabled(!isVideoEnabled));
    publisher.publishVideo(!isVideoEnabled);
  };

  // 마이크 온오프
  const toggleAudio = () => {
    dispatch(setIsAudioEnabled(!isAudioEnabled));
    publisher.publishAudio(!isAudioEnabled);
  };

  // 전체화면 온오프
  useEffect(() => {
    console.log(
      "tourId:",
      tourId,
      "tourUID:",
      tourUID,
      "세션아이디",
      sessionid
    );

    const handleFullscreenChange = () => {
      dispatch(setIsFullScreen(!!document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullScreen = useFullScreenHandle();

  const toggleFullScreen = () => {
    if (isFullScreen) {
      dispatch(setIsFullScreen(false));
      handleFullScreen.exit(); // 전체화면 종료
    } else {
      dispatch(setIsFullScreen(true));
      handleFullScreen.enter(); // 전체화면 시작
    }
  };

  // 투표 모달 온오프
  const toggleVote = () => {
    dispatch(setIsVoteOpen(!isVoteOpen));
  };

  const handleLeaveChatToggle = () => {
    dispatch(setIsChatOpen(false));
  };

  const handleJoinChatToggle = () => {
    dispatch(setIsChatOpen(true));
  };

  // 채팅방 나가기, 재입장 호출

  const chatRoomRef = useRef(null);

  const onLeaveChat = () => {
    console.log("Leave chat");
    if (chatRoomRef.current) {
      chatRoomRef.current.handleLeaveChat();
    }
  };

  const onJoinChat = () => {
    console.log("join chat");
    if (chatRoomRef.current) {
      chatRoomRef.current.handleJoinChat();
    }
  };

  // 투표하기(init)호출
  const initRef = useRef(null);

  // 가이드가 투표 시작을 하면, setVoting(true)가 되면서 TestTest의 init 실행시키기
  useEffect(() => {
    if (voting) {
      console.log("투표시작");
      if (initRef.current) {
        console.log("여기까지들어가는지궁금해서");
        initRef.current.init();
      }
    } else {
      console.log("투표종료");
    }
  }, [voting]);

  // 투표함 생성 받기(SUB)
  function subscribeVote(stomp) {
    stomp.subscribe(
      `/sub/chat/vote/create/room/${tourUID}`,
      (data) => {
        const received = JSON.parse(data.body);
        const receivedMessage = {
          option1: received.column1,
          option2: received.column2,
        };
        setVote(true);
        setVoting(true);
        dispatch(setOption1(received.column1));
        dispatch(setOption2(received.column2));
        console.log("투표 구독으로 받아오는 메시지", receivedMessage);
      },
      { id: "subVote" }
    );
  }

  const onChangeColumn1 = (e) => {
    setColumn1(e.target.value);
  };

  const onChangeColumn2 = (e) => {
    setColumn2(e.target.value);
  };

  const createVote = async () => {
    // 투표함 생성(POST)
    try {
      const requestBody = {
        roomUid: tourUID,
        column1: column1,
        column2: column2,
      };

      const response = await fetch(
        "https://busanwavrserver.store/chat/vote/create",
        {
          method: "POST",
          headers: {
            Authorization: accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log(requestBody);

      if (response.status === 200) {
        console.log("제대로왔음", response);
        setColumn1("");
        setColumn2("");
      } else {
        // 에러
        console.log(response);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 사용자 투표 실시간 받기(SUB)
  function subscribeVoteCnt(stomp) {
    stomp.subscribe(
      `/sub/chat/vote/room/${tourUID}`,
      (data) => {
        const received = JSON.parse(data.body);
        const receivedMessage = {
          nickname: received.sender.nickname,
          selectType: received.selectType,
        };
        console.log("사용자 투표로 받아오는 메시지", receivedMessage);
        if (received.selectType == 1) {
          dispatch(setOption1Cnt(1));
          console.log(option1Cnt);
        } else {
          dispatch(setOption2Cnt(1));
          console.log(option2Cnt);
        }
      },
      { id: "voteCnt" }
    );
  }

  // 가이드 투표 종료하기(POST)
  async function endVote() {
    try {
      const requestBody = {
        roomUid: tourUID,
      };

      const response = await fetch(
        "https://busanwavrserver.store/chat/vote/end",
        {
          method: "POST",
          headers: {
            Authorization: accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.status === 200) {
        console.log("투표 종료 요청", response);
      } else {
        // 에러
        console.log("에러", response);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // 가이드 투표 종료인지 확인하기(SUB)
  function subscribeEndVote(stomp) {
    stomp.subscribe(
      `/sub/chat/vote/end/${tourUID}`,
      (data) => {
        setVoting(false);
        console.log("투표 종료");
      },
      { id: "endVote" }
    );
  }

  const getToken = useCallback(async () => {
    return createSession(sessionid).then((sessionId) => createToken(sessionId));
  }, [sessionid]);

  const createSession = async (sessionId) => {
    const response = await axios.post(
      APPLICATION_SERVER_URL + "/sessions",
      { customSessionId: sessionId },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(response.data);
    return response.data; // The sessionId
  };

  const createToken = async (sessionId) => {
    const response = await axios.post(
      APPLICATION_SERVER_URL + "/" + sessionId + "/connections",
      {},
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log(response.data);
    return response.data; // The token
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <FullScreen handle={handleFullScreen}>
          <div style={{ width: "100vw", height: "100vh" }}>
            <Allotment>
              <Allotment.Pane
                minSize={1200}
                snap={false}
                className="bg-zinc-800"
              >
                <Allotment vertical>
                  {/* 유저비디오 */}
                  <Allotment.Pane maxSize={200} snap>
                    <UserVideoContainer
                      publisher={publisher}
                      subscribers={subscribers}
                      handleMainVideoStream={handleMainVideoStream}
                    />
                  </Allotment.Pane>
                  {/* VR라이브 */}
                  <Allotment.Pane>
                    <LiveExample className="live-example" videoId={videoId} />
                  </Allotment.Pane>
                </Allotment>
              </Allotment.Pane>
              {/* 추가 기능 */}
              {(isVoteOpen || isChatOpen) && (
                <Allotment.Pane minSize={300}>
                  <Allotment vertical>
                    {isVoteOpen && (
                      <Allotment.Pane className="bg-zinc-800 text-white">
                        <div className="bg-zinc-900 h2 text-white font-semibold p-4 px-6 text-left">
                          투표
                        </div>
                        {userType === "GUIDE" ? (
                          // 가이드는 투표form, 유저들에게는 보이스채팅 기능
                          <div className="flex flex-col gap-4 justify-center items-center px-12 py-6 text-black">
                            <Input
                              type="text"
                              label="1번 선택지"
                              value={column1}
                              onChange={onChangeColumn1}
                            />
                            <Input
                              type="text"
                              label="2번 선택지"
                              value={column2}
                              onChange={onChangeColumn2}
                            />
                            <div className="flex gap-4 items-center w-full">
                              <Button
                                color="primary"
                                variant="flat"
                                onClick={createVote}
                                className="w-full"
                              >
                                투표 시작하기
                              </Button>
                              <Button
                                color="danger"
                                variant="flat"
                                onClick={endVote}
                                className="w-full"
                              >
                                투표 종료하기
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <TestTest
                            ref={initRef}
                            tourUID={tourUID}
                            accessToken={accessToken}
                            voting={voting}
                            setVoting={setVoting}
                          />
                        )}
                        <VoteModal voting={voting} />
                      </Allotment.Pane>
                    )}
                    {isChatOpen && (
                      <Allotment.Pane className="bg-zinc-800 text-white">
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            top: 0,
                            right: 0,
                          }}
                        >
                          <ChatRoom
                            ref={chatRoomRef}
                            onload={onload}
                            onConnect={onConnect}
                            tourUID={tourUID}
                          />
                          <Stt tourUID={tourUID} />
                        </div>
                      </Allotment.Pane>
                    )}
                  </Allotment>
                </Allotment.Pane>
              )}
            </Allotment>
          </div>
          <Toolbar
            leaveSession={leaveSession}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
            switchVideo={switchVideo}
            toggleFullScreen={toggleFullScreen}
            isFullScreen={isFullScreen}
            isChatOpen={isChatOpen}
            isVoteOpen={isVoteOpen}
            toggleVote={toggleVote}
            handleLeaveChatToggle={handleLeaveChatToggle}
            handleJoinChatToggle={handleJoinChatToggle}
            onLeaveChat={onLeaveChat}
            onJoinChat={onJoinChat}
          />
        </FullScreen>
      )}
    </>
  );
};

export default LiveStreamView;
