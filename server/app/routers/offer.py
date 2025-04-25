# app/routers/offer.py
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription
from deps import get_settings, get_conn_mgr
from track import FrameTrack

router = APIRouter()

@router.post("/offer")
async def offer(
    request: Request,
    settings = Depends(get_settings),
    conn_mgr = Depends(get_conn_mgr),
):
    payload = await request.json()
    code, sdp, typ = payload.get("code"), payload.get("sdp"), payload.get("type")
    if not (code and sdp and typ):
        raise HTTPException(400, "Missing code / SDP / type")

    # wait for at least one frame
    for _ in range(10):
        if await FrameTrack.store.get_latest(code):
            break
        await asyncio.sleep(0.1)
    else:
        raise HTTPException(404, "No active broadcast for this code")

    pc = RTCPeerConnection()
    await conn_mgr.add_pc(code, pc)

    @pc.on("connectionstatechange")
    async def on_change():
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            await conn_mgr.remove_pc(code, pc)

    await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))
    pc.addTrack(FrameTrack(code))
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return JSONResponse({"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})
