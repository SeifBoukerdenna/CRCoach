#!/usr/bin/env python3
import asyncio, json, cv2, numpy as np
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame

pcs = set()
latest_frame = None

class FrameTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        global latest_frame
        # 1️⃣ Wait for the next JPEG frame
        while latest_frame is None:
            await asyncio.sleep(0.001)

        # 2️⃣ Decode JPEG → BGR → RGB
        img = cv2.imdecode(np.frombuffer(latest_frame, np.uint8), cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 3️⃣ Create a VideoFrame from the ndarray
        frame = VideoFrame.from_ndarray(img, format="rgb24")

        # 4️⃣ IMPORTANT: assign a valid timestamp & time_base
        pts, time_base = await self.next_timestamp()
        frame.pts = pts
        frame.time_base = time_base

        return frame
frame_track = FrameTrack()

async def upload(request):
    global latest_frame
    latest_frame = await request.read()
    # print(f"[{request.remote}] frame received ({len(latest_frame)} bytes)")
    return web.Response(status=200)

async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    # 1. Apply the browser's SDP offer
    await pc.setRemoteDescription(offer)

    # 2. Add our sendonly video track
    pc.addTrack(frame_track)

    # 3. Build the SDP answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # 4. WAIT for ICE gathering to finish so candidates are in the SDP
    #    This ensures the client can actually reach us.
    #    We listen for the change to 'complete', or timeout after 2 s.
    ice_complete = asyncio.Event()

    @pc.on("icegatheringstatechange")
    def on_ice_state():
        if pc.iceGatheringState == "complete":
            ice_complete.set()

    # If already complete (some versions), set immediately
    if pc.iceGatheringState == "complete":
        ice_complete.set()

    try:
        await asyncio.wait_for(ice_complete.wait(), timeout=2.0)
    except asyncio.TimeoutError:
        print("⚠️ ICE gathering timed out, sending answer anyway")

    print("✅ Sending SDP answer with candidates")

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })


HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>iOS WebRTC Stream</title>
  <style>
    body { text-align:center; font-family:sans-serif; margin-top:2rem; }
    video { border:2px solid #444; max-width:90%; }
    #status { margin:1rem; font-weight:bold; }
    #info { margin-top:.5rem; color:#555; }
    #debug { text-align:left; width:90%; margin:1rem auto; font-size:0.8rem; color:#333; }
  </style>
</head>
<body>
  <h1>📱 iOS Live (WebRTC)</h1>
  <div id="status">Disconnected</div>
  <video id="video" autoplay playsinline></video>
  <div id="info">—</div>
  <button id="start">Connect Stream</button>
  <pre id="debug"></pre>

  <script>
    const log = msg => {
      console.log(msg);
      document.getElementById("debug").innerText += msg + "\\n";
    };

    const status = document.getElementById("status");
    const info   = document.getElementById("info");
    const debug  = document.getElementById("debug");
    const video  = document.getElementById("video");

    // ⚙️ Use public STUN for better candidates
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = e => {
      log("ICE candidate: " + JSON.stringify(e.candidate));
    };
    pc.onicegatheringstatechange = () => {
      log("ICE gathering: " + pc.iceGatheringState);
    };
    pc.onconnectionstatechange = () => {
      status.innerText = "Connection: " + pc.connectionState;
      log("Connection state: " + pc.connectionState);
    };
    pc.oniceconnectionstatechange = () => {
      log("ICE connection: " + pc.iceConnectionState);
    };

    // prepare to receive video
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.ontrack = e => {
      log("▶️ ontrack fired");
      status.innerText = "▶️ Streaming";
      video.srcObject = e.streams[0];
      video.onloadedmetadata = () => {
        status.innerText = `▶️ ${video.videoWidth}×${video.videoHeight}`;
        log(`Video size: ${video.videoWidth}×${video.videoHeight}`);
        startStats();
      };
    };

    // compute FPS & show it
    let lastTime = performance.now(), frames = 0;
    function startStats() {
      function loop() {
        frames++;
        let now = performance.now(), dt = now - lastTime;
        if (dt >= 1000) {
          let fps = (frames/dt*1000).toFixed(1);
          info.innerText = `Resolution: ${video.videoWidth}×${video.videoHeight} | FPS: ${fps}`;
          frames = 0; lastTime = now;
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }

    // kickoff button
    document.getElementById("start").onclick = async () => {
      debug.innerText = "";  // clear old logs
      status.innerText = "⚙️ Creating offer…";
      log("🔹 Creating offer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log("🔹 Local SDP:" + pc.localDescription.sdp);

      status.innerText = "⚙️ Gathering ICE…";
      // wait for the null candidate
      await new Promise(r => {
        pc.onicecandidate = evt => {
          log("ICE candidate: " + JSON.stringify(evt.candidate));
          if (!evt.candidate) r();
        };
        setTimeout(r, 3000);
      });

      status.innerText = "⚙️ Sending offer…";
      log("🔹 Sending SDP to server");
      const res = await fetch("/offer", {
        method: "POST",
        body: JSON.stringify(pc.localDescription),
        headers: { "Content-Type":"application/json" }
      });
      const ans = await res.json();
      log("🔹 Received answer SDP:" + ans.sdp);
      try {
        await pc.setRemoteDescription(ans);
      } catch(e) {
        log("❌ setRemoteDescription error: " + e);
      }
      log("✅ setRemoteDescription done");
    };
  </script>
</body>
</html>
"""


async def index(request):
    return web.Response(text=HTML, content_type="text/html")

app = web.Application()
app.router.add_get("/", index)
app.router.add_post("/upload", upload)
app.router.add_post("/offer", offer)

if __name__ == "__main__":
    print("🚀 Server running at http://0.0.0.0:8080/")
    web.run_app(app, host="0.0.0.0", port=8080)
