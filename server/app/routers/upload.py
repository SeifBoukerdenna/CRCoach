# app/routers/upload.py
from fastapi import APIRouter, Request, HTTPException, Depends
from deps import get_settings, get_store

router = APIRouter()

@router.post("/upload/{code}")
async def upload(
    code: str,
    request: Request,
    settings = Depends(get_settings),
    store    = Depends(get_store),
):
    data = await request.body()
    if not data.startswith(b"\xFF\xD8"):
        raise HTTPException(400, "Invalid JPEG payload")

    q = request.headers.get("X-Quality-Level", "medium")
    if q not in settings.TARGET_WIDTHS:
        q = "medium"

    await store.save_frame(code, data, q, settings.FRAME_TIMEOUT)
    return {"status": "ok"}
