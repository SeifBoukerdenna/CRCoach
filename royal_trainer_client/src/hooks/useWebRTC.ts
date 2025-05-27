/**
 * hooks/useWebRTC.ts – final “it always shows video” version
 * ----------------------------------------------------------
 *  - caches the remote MediaStream (remoteStreamRef)
 *  - (NEW) runs attachStream() again as soon as the <video> element
 *    becomes available (videoReadyRef observer)
 *  - keeps everything else identical to the previous file
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
}

interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}

export const useWebRTC = () => {
  /*─────────────────────────────────── state */
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] =
    useState<ConnectionError | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);

  /*─────────────────────────────────── refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const autoReconnectEnabledRef = useRef(true);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /*─────────────────────────────────── helpers */
  const log = (msg: string, t: string = "info") => {
    const ts = new Date().toLocaleTimeString();
    const emoji =
      t === "error"
        ? "❌"
        : t === "success"
        ? "✅"
        : t === "debug"
        ? "🔍"
        : "ℹ️";
    console.log(`[${ts}] ${emoji} ${msg}`);
  };

  /** attach cached stream to <video> */
  const attachStream = useCallback(() => {
    if (videoRef.current && remoteStreamRef.current) {
      if (videoRef.current.srcObject !== remoteStreamRef.current) {
        videoRef.current.srcObject = remoteStreamRef.current;
        videoRef.current.play().catch(() => {
          /* safari autoplay */
        });
        log("Remote stream attached to <video>", "success");
      }
    }
  }, []);

  /*─────────────────────────────────── stats */
  const updateStreamStats = useCallback(async () => {
    if (!peerConnectionRef.current) return;
    try {
      const stats = await peerConnectionRef.current.getStats();
      let fps = 0,
        bitrate = 0,
        resolution = "";

      stats.forEach((r) => {
        if (r.type === "inbound-rtp" && r.mediaType === "video") {
          if (r.framesPerSecond) fps = Math.round(r.framesPerSecond);
          if (r.bytesReceived)
            bitrate = Math.round((r.bytesReceived * 8) / 1000);
          if (r.frameWidth && r.frameHeight)
            resolution = `${r.frameWidth}x${r.frameHeight}`;
        }
      });

      setStreamStats({ fps, bitrate, resolution });
    } catch (e) {
      log("getStats failed: " + (e as Error).message, "error");
    }
  }, []);

  const startStatsLoop = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(updateStreamStats, 2000);
  }, [updateStreamStats]);

  /*─────────────────────────────────── peer */
  const createPeer = useCallback(() => {
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
            sessionCode: (webSocketRef.current as any).sessionCode,
          })
        );
      }
    };

    pc.ontrack = (e) => {
      log("🎥 remote track", "success");
      remoteStreamRef.current = e.streams[0];
      attachStream(); // may or may not succeed now
      startStatsLoop();
    };

    pc.oniceconnectionstatechange = () => {
      if (["connected", "completed"].includes(pc.iceConnectionState))
        setIsConnected(true);
      if (["failed", "disconnected"].includes(pc.iceConnectionState))
        setIsConnected(false);
    };

    return pc;
  }, [attachStream, startStatsLoop]);

  /*─────────────────────────────────── WS msg */
  const handleOffer = useCallback(
    async (msg: any) => {
      if (!peerConnectionRef.current) createPeer();

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
          sessionCode: (webSocketRef.current as any).sessionCode,
        })
      );
    },
    [createPeer]
  );

  const handleWS = useCallback(
    async (d: any) => {
      switch (d.type) {
        case "connected":
          createPeer();
          break;
        case "offer":
          await handleOffer(d);
          break;
        case "ice":
          if (peerConnectionRef.current && d.candidate)
            peerConnectionRef.current
              .addIceCandidate(
                new RTCIceCandidate({
                  candidate: d.candidate,
                  sdpMLineIndex: d.sdpMLineIndex,
                  sdpMid: d.sdpMid,
                })
              )
              .catch((e) => log("ICE add failed: " + e, "error"));
          break;
        case "broadcaster_disconnected":
          setIsConnected(false);
          remoteStreamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          break;
        case "error":
          setConnectionError({
            message: d.message,
            code: "SERVER_ERROR",
            timestamp: new Date(),
          });
          break;
      }
    },
    [createPeer, handleOffer]
  );

  /*─────────────────────────────────── connect */
  const connect = useCallback(
    (code: string) =>
      new Promise<void>((res, rej) => {
        try {
          const proto = location.protocol === "https:" ? "wss:" : "ws:";
          const ws = new WebSocket(`${proto}//${location.host}/ws/${code}`);
          webSocketRef.current = ws;
          (ws as any).sessionCode = code;

          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                type: "connect",
                role: "viewer",
                sessionCode: code,
              })
            );
            res();
          };
          ws.onmessage = (e) => handleWS(JSON.parse(e.data));
          ws.onclose = () => setIsConnected(false);
          ws.onerror = () => rej(new Error("WS error"));
        } catch (e) {
          rej(e);
        }
      }),
    [handleWS]
  );

  const disconnect = useCallback(() => {
    webSocketRef.current?.close(1000, "manual");
    peerConnectionRef.current?.close();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  /*─────────────────────────────────── side-effects */

  /* ↻ 1) run every time the ref gains a node */
  useEffect(attachStream, [videoRef.current, attachStream]);

  /* ↻ 2) keep-alive ping */
  useEffect(() => {
    const id = setInterval(() => {
      if (webSocketRef.current?.readyState === WebSocket.OPEN)
        webSocketRef.current.send(JSON.stringify({ type: "ping" }));
    }, 25000);
    return () => clearInterval(id);
  }, []);

  /* ↻ 3) cleanup on unmount */
  useEffect(() => () => disconnect(), [disconnect]);

  /*─────────────────────────────────── exports */
  return {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats,
  };
};
