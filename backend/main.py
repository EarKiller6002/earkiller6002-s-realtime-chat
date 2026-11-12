from datetime import datetime
from typing import Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]

    async def broadcast(self, message: dict, exclude_user: Optional[str] = None):
        for user, connection in list(self.active_connections.items()):
            if user != exclude_user:
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(user)


manager = ConnectionManager()


def get_current_time() -> str:
    return datetime.now().strftime("%H:%M:%S")


@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket, username)

    await manager.broadcast(
        {
            "type": "system",
            "username": "System",
            "text": f"Пользователь {username} присоединился к чату",
            "timestamp": get_current_time(),
        },
        exclude_user=username,
    )

    try:
        while True:
            data = await websocket.receive_json()
            message_text = data.get("text", "").strip()

            if message_text:
                payload = {
                    "type": "message",
                    "username": username,
                    "text": message_text,
                    "timestamp": get_current_time(),
                }
                await manager.broadcast(payload)

    except WebSocketDisconnect:
        manager.disconnect(username)
        await manager.broadcast(
            {
                "type": "system",
                "username": "System",
                "text": f"Пользователь {username} покинул чат",
                "timestamp": get_current_time(),
            }
        )
