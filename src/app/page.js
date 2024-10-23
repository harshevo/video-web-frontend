"use client";

import { useState, useEffect, useRef, useReducer } from "react";

export default function VideoCall() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);
  const ws = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = new WebSocket("wss://video.evoxreality.com/api/ws"); // Replace with your actual WebSocket server
    ws.current = socket;

    // Set up WebRTC
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onmessage = (e) => console.log("Got a message: " + e.data);
    pc.onopen = (e) => console.log("Connection Opened: ");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({ type: "ice-candidate", candidate: event.candidate })
        );
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current = pc;

    // Get local media stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    // WebSocket message handling
    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("message recieved : " + message);
      console.log("type:" + event.data.type);
      if (message.type == "offer") {
        console.log("Offer: " + message);
        await peerConnection.current.setRemoteDescription(message.offer);
        console.log("Offer Set");

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", answer }));
      } else if (message.type == "answer") {
        console.log("Answer: " + message);
        await peerConnection.current.setRemoteDescription(message.answer);
      } else if (message.type == "ice-candidate") {
        peerConnection.current.addIceCandidate(
          new RTCIceCandidate(message.candidate)
        );
        console.log("ice candidate set: ");
      }
    };

    return () => {
      socket.close();
      pc.close();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleCall = async () => {
    console.log("Inside handle Call: ");
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    ws.current.send(JSON.stringify({ type: "offer", offer }));
    console.log("Offer Created and Sent :" + JSON.stringify(offer));
  };

  const handleAnswer = async () => {
    return "Hello";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto border-2 border-blue-500 rounded-lg"
          />
          <span className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded">
            Local
          </span>
        </div>
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-auto border-2 border-green-500 rounded-lg"
          />
          <span className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded">
            Remote
          </span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleCall}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Call
        </button>
        <button
          onClick={handleAnswer}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Answer
        </button>
      </div>
    </div>
  );
}
