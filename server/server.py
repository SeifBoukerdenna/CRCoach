import asyncio, cv2, numpy as np
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame

pcs = set()
latest_frame = None

class FrameTrack(VideoStreamTrack):
    """A WebRTC track that pulls the latest JPEG and downsamples it."""
    async def recv(self):
        global latest_frame
        # wait for first frame
        while latest_frame is None:
            await asyncio.sleep(0.001)

        # decode JPEG → BGR
        arr = np.frombuffer(latest_frame, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        # downsample to 720px wide
        height, width = img.shape[:2]
        target_w = 720
        target_h = int(height * (target_w / width))
        img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)

        # BGR → RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # wrap in VideoFrame
        frame = VideoFrame.from_ndarray(img, format="rgb24")
        # timestamp it
        pts, tb = await self.next_timestamp()
        frame.pts = pts
        frame.time_base = tb
        return frame

frame_track = FrameTrack()

async def upload(request):
    """POST /upload — receive a JPEG frame from iOS"""
    global latest_frame
    latest_frame = await request.read()
    return web.Response(status=200)

async def offer(request):
    """POST /offer — handle SDP offer → send SDP answer (with full ICE)."""
    params = await request.json()
    pc = RTCPeerConnection()
    pcs.add(pc)

    await pc.setRemoteDescription(
        RTCSessionDescription(sdp=params["sdp"], type=params["type"])
    )
    pc.addTrack(frame_track)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # wait for ICE completion so SDP has all candidates
    ice_done = asyncio.Event()
    @pc.on("icegatheringstatechange")
    def check_ice():
        if pc.iceGatheringState == "complete":
            ice_done.set()
    if pc.iceGatheringState == "complete":
        ice_done.set()
    try:
        await asyncio.wait_for(ice_done.wait(), timeout=2.0)
    except asyncio.TimeoutError:
        pass

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })

async def index(request):
    return web.FileResponse("client/index.html")

app = web.Application()
# app.router.add_get("/", index)
# app.router.add_static("/static/", path="client/", show_index=False)
app.router.add_post("/upload", upload)
app.router.add_post("/offer", offer)

if __name__ == "__main__":
    print("🚀 Server running at http://0.0.0.0:8080/")
    web.run_app(app, host="0.0.0.0", port=8080)
