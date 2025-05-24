# server/app/routers/inference.py
from fastapi import APIRouter, Request, HTTPException, WebSocket, WebSocketDisconnect
import logging
import asyncio
import json

router = APIRouter(prefix="/inference", tags=["inference"])
logger = logging.getLogger("inference_router")

@router.get("/{code}")
async def get_inference(code: str, request: Request):
    """Get the latest YOLO inference results for a session code"""
    if not hasattr(request.app.state, "inference_store"):
        raise HTTPException(501, "Inference service not available")

    result = await request.app.state.inference_store.get_inference(code)
    if not result:
        raise HTTPException(404, "No inference results found for this code")

    return result

@router.get("/active/sessions")
async def get_active_sessions(request: Request):
    """Get all active sessions with inference results"""
    if not hasattr(request.app.state, "inference_store"):
        raise HTTPException(501, "Inference service not available")

    active = await request.app.state.inference_store.get_all_active()
    return {
        "active_sessions": list(active.keys()),
        "count": len(active)
    }

@router.websocket("/ws/{code}")
async def inference_websocket(websocket: WebSocket, code: str, request: Request):
    """WebSocket endpoint for real-time inference updates"""
    await websocket.accept()

    if not hasattr(request.app.state, "inference_store"):
        await websocket.send_json({"error": "Inference service not available"})
        await websocket.close()
        return

    try:
        # Send updates every 100ms
        while True:
            result = await request.app.state.inference_store.get_inference(code)
            if result:
                await websocket.send_json({
                    "type": "inference_update",
                    "data": result
                })
            else:
                await websocket.send_json({
                    "type": "no_data",
                    "message": "No inference results available"
                })

            await asyncio.sleep(0.1)  # 10 updates per second

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for code {code}")
    except Exception as e:
        logger.error(f"WebSocket error for code {code}: {str(e)}")
        await websocket.close()