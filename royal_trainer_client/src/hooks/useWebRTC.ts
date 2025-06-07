import { useState, useRef, useCallback, useEffect } from "react";

interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
  endToEndLatency?: number;
  signalingLatency?: number;
  networkLatency?: number;
}

interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}

export const useWebRTC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] =
    useState<ConnectionError | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const sessionCodeRef = useRef<string>("");
  const connectionIdRef = useRef<string>("");

  const log = (msg: string, level: string = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = level === "error" ? "❌" : level === "success" ? "✅" : "ℹ️";
    console.log(`[${timestamp}] ${emoji} ${msg}`);
  };

  const updateStreamStats = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      const stats = await peerConnectionRef.current.getStats();
      let fps = 0;
      let bitrate = 0;
      let resolution = "";

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.mediaType === "video") {
          if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
          if (report.bytesReceived)
            bitrate = Math.round((report.bytesReceived * 8) / 1000);
          if (report.frameWidth && report.frameHeight) {
            resolution = `${report.frameWidth}x${report.frameHeight}`;
          }
        }
      });

      setStreamStats((prev) => ({ ...prev, fps, bitrate, resolution }));
    } catch (e) {
      log("Failed to get WebRTC stats: " + (e as Error).message, "error");
    }
  }, []);

  const startStatsLoop = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(updateStreamStats, 1000);
  }, [updateStreamStats]);

  const attachStream = useCallback(() => {
    if (videoRef.current && remoteStreamRef.current) {
      if (videoRef.current.srcObject !== remoteStreamRef.current) {
        videoRef.current.srcObject = remoteStreamRef.current;
        videoRef.current.play().catch(() => {
          log("Failed to play video", "error");
        });
        log("Remote stream attached to video element", "success");
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && webSocketRef.current?.readyState === WebSocket.OPEN) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "ice",
            candidate: e.candidate.candidate,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
            sdpMid: e.candidate.sdpMid,
            sessionCode: sessionCodeRef.current,
            from_viewer_id: connectionIdRef.current,
            timestamp: performance.now(),
          })
        );
      }
    };

    pc.ontrack = (e) => {
      log("Remote track received", "success");
      remoteStreamRef.current = e.streams[0];
      attachStream();
      startStatsLoop();
    };

    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state: ${pc.iceConnectionState}`);
      setIsConnected(
        ["connected", "completed"].includes(pc.iceConnectionState)
      );
    };

    return pc;
  }, [attachStream, startStatsLoop]);

  const handleOffer = useCallback(
    async (msg: any) => {
      log("Received offer from broadcaster", "success");

      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      try {
        await peerConnectionRef.current!.setRemoteDescription({
          type: "offer",
          sdp: msg.sdp,
        });

        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);

        webSocketRef.current?.send(
          JSON.stringify({
            type: "answer",
            sdp: answer.sdp,
            sessionCode: sessionCodeRef.current,
            from_viewer_id: connectionIdRef.current,
            timestamp: performance.now(),
          })
        );

        log("Answer sent to broadcaster", "success");
      } catch (error) {
        log(`Failed to handle offer: ${error}`, "error");
        setConnectionError({
          message: `Failed to process offer: ${error}`,
          code: "OFFER_ERROR",
          timestamp: new Date(),
        });
      }
    },
    [createPeerConnection]
  );

  const handleWebSocketMessage = useCallback(
    async (data: any) => {
      switch (data.type) {
        case "connected":
          connectionIdRef.current = data.connectionId || "";
          log(
            `Connected as viewer with ID: ${connectionIdRef.current}`,
            "success"
          );
          log(`Session has ${data.viewerCount}/${data.maxViewers} viewers`);

          if (data.latency_info?.signaling_latency_ms) {
            setStreamStats((prev) => ({
              ...prev,
              signalingLatency: data.latency_info.signaling_latency_ms,
            }));
          }

          // Create peer connection early for faster setup
          if (!peerConnectionRef.current) {
            createPeerConnection();
          }
          break;

        case "broadcaster_joined":
          log("Broadcaster joined the session");
          break;

        case "offer":
          // Check if this offer is meant for us
          const targetViewerId = data.target_viewer_id || data.for_viewer;
          if (!targetViewerId || targetViewerId === connectionIdRef.current) {
            await handleOffer(data);
          } else {
            log(`Offer for different viewer: ${targetViewerId}`);
          }
          break;

        case "ice":
          if (peerConnectionRef.current && data.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate({
                  candidate: data.candidate,
                  sdpMLineIndex: data.sdpMLineIndex,
                  sdpMid: data.sdpMid,
                })
              );
              log("ICE candidate added successfully");
            } catch (e) {
              log("Failed to add ICE candidate: " + e, "error");
            }
          }
          break;

        case "broadcaster_disconnected":
          log("Broadcaster disconnected");
          setIsConnected(false);
          remoteStreamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          break;

        case "error":
          log(`Server error: ${data.message}`, "error");
          setConnectionError({
            message: data.message,
            code: "SERVER_ERROR",
            timestamp: new Date(),
          });
          break;

        default:
          log(`Unknown message type: ${data.type}`);
          break;
      }
    },
    [createPeerConnection, handleOffer]
  );

  const connect = useCallback(
    (code: string) =>
      new Promise<void>((resolve, reject) => {
        try {
          sessionCodeRef.current = code;
          const protocol = location.protocol === "https:" ? "wss:" : "ws:";
          const ws = new WebSocket(`${protocol}//${location.host}/ws/${code}`);
          webSocketRef.current = ws;

          ws.onopen = () => {
            log(`WebSocket opened for session ${code}`, "success");
            ws.send(
              JSON.stringify({
                type: "connect",
                role: "viewer",
                sessionCode: code,
                timestamp: performance.now(),
              })
            );
            resolve();
          };

          ws.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              handleWebSocketMessage(data);
            } catch (error) {
              log(`Failed to parse WebSocket message: ${error}`, "error");
            }
          };

          ws.onclose = (e) => {
            log(`WebSocket closed: ${e.code} ${e.reason}`);
            setIsConnected(false);
          };

          ws.onerror = () => {
            log("WebSocket connection failed", "error");
            reject(new Error("WebSocket connection failed"));
          };
        } catch (e) {
          reject(e);
        }
      }),
    [handleWebSocketMessage]
  );

  const disconnect = useCallback(() => {
    log("Disconnecting WebRTC connection");

    webSocketRef.current?.close(1000, "manual");
    peerConnectionRef.current?.close();

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    setIsConnected(false);
    setConnectionError(null);
    connectionIdRef.current = "";
  }, []);

  // Auto-attach stream when video ref changes
  useEffect(() => {
    attachStream();
  }, [attachStream]);

  // Keep-alive ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "ping",
            timestamp: performance.now(),
          })
        );
      }
    }, 25000);

    return () => clearInterval(pingInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats,
  };
};
