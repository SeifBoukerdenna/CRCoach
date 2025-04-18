/* eslint-disable @typescript-eslint/no-explicit-any */
// src/App.tsx
import { useEffect, useRef, useState } from 'react'
import './App.css'

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection>(null)
  const [status, setStatus] = useState<'disconnected' | 'creating' | 'gathering' | 'sending' | 'connected' | 'error'>('disconnected')
  const [connecting, setConnecting] = useState(false)
  const [resolution, setResolution] = useState('—×—')
  const [fps, setFps] = useState('— FPS')
  const [rtt, setRtt] = useState('— ms')

  // Initialize RTCPeerConnection once
  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pcRef.current = pc

    pc.onconnectionstatechange = () => {
      setStatus(pc.connectionState as any)
    }

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.ontrack = ({ streams }) => {
      const stream = streams[0]
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        const w = videoRef.current!.videoWidth
        const h = videoRef.current!.videoHeight
        setResolution(`${w}×${h}`)
        startFPS()
      }
    }

    const interval = setInterval(async () => {
      if (!pcRef.current) return
      const stats = await pcRef.current.getStats()
      stats.forEach(report => {
        if (
          report.type === 'candidate-pair' &&
          report.state === 'succeeded' &&
          report.currentRoundTripTime != null
        ) {
          setRtt(`${Math.round(report.currentRoundTripTime * 1000)} ms`)
        }
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      pc.close()
    }
  }, [])

  // FPS counter
  let lastT = performance.now(), frames = 0
  function startFPS() {
    function loop() {
      frames++
      const now = performance.now(), dt = now - lastT
      if (dt >= 1000) {
        setFps(`${Math.round((frames / dt) * 1000)} FPS`)
        frames = 0
        lastT = now
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  // negotiate offer/answer
  async function handleClick() {
    if (!pcRef.current) return

    setConnecting(true)
    setStatus('creating')
    try {
      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)

      setStatus('gathering')
      await new Promise<void>(resolve => {
        const pc = pcRef.current!
        pc.onicecandidate = ev => {
          if (!ev.candidate) resolve()
        }
        setTimeout(resolve, 5000)
      })

      setStatus('sending')
      const res = await fetch('/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pcRef.current.localDescription)
      })
      const ans = await res.json()
      await pcRef.current.setRemoteDescription(ans)

      setStatus('connected')
    } catch {
      setStatus('error')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="app">
      <h1>📱 iOS Live (WebRTC)</h1>

      <div className="controls">
        <button onClick={handleClick} disabled={connecting}>
          {status === 'disconnected'
            ? 'Connect Stream'
            : status === 'connected'
              ? 'Re‑connect?'
              : '…'}
        </button>
        <div className="status">Status: {status}</div>
      </div>

      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline />
        <div className="metrics">
          <span>{resolution}</span>
          <span>{fps}</span>
          <span>{rtt}</span>
        </div>
      </div>
    </div>
  )
}
