import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
from datetime import datetime
import json
import uuid

from bot import BotLogic

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory State ---
vehicles = [
    {"id": "v1", "name": "JCB", "rate": 2500, "image": "🚜"},
    {"id": "v2", "name": "Truck", "rate": 4000, "image": "🚚"},
    {"id": "v3", "name": "Bulldozer", "rate": 6000, "image": "🏗️"},
]

# bookings map booking_id -> booking data
bookings: Dict[str, dict] = {}
# customer states for bot interaction
customer_sessions: Dict[str, dict] = {}
# active drivers tracking
active_drivers: Dict[str, dict] = {
    "driver_1": {"location": None, "status": "AVAILABLE", "current_booking": None}
}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, ws: WebSocket, unified_id: str):
        await ws.accept()
        self.active_connections[unified_id] = ws

    def disconnect(self, unified_id: str):
        if unified_id in self.active_connections:
            del self.active_connections[unified_id]

    async def send_personal_message(self, message: str, unified_id: str):
        if unified_id in self.active_connections:
            await self.active_connections[unified_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)


manager = ConnectionManager()
bot = BotLogic(customer_sessions, vehicles, manager)


@app.websocket("/ws/{client_type}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_type: str, client_id: str):
    unified_id = f"{client_type}_{client_id}"
    await manager.connect(websocket, unified_id)
    try:
        if client_type == "customer":
            # trigger first message if new
            if client_id not in customer_sessions:
                await bot.handle_message(client_id, "start")

            # send current booking state if they have one
            # Look up if customer has a booking
            active_booking = next(
                (b for b in bookings.values() if b["customer_id"] == client_id), None
            )
            if active_booking:
                await manager.send_personal_message(
                    json.dumps({"type": "booking_update", "booking": active_booking}),
                    unified_id,
                )

        while True:
            data = await websocket.receive_text()
            parsed_data = json.loads(data)

            if client_type == "customer":
                msg_type = parsed_data.get("type")
                if msg_type == "chat_message":
                    result = await bot.handle_message(
                        client_id, parsed_data.get("text")
                    )
                    if result and result.get("event") == "create_booking":
                        # Create booking
                        booking_id = str(uuid.uuid4())[:8]
                        new_booking = {
                            "id": booking_id,
                            "customer_id": client_id,
                            "vehicle": result["vehicle"],
                            "status": "WAITING_FOR_DISPATCH",
                            "driver_id": "driver_1",  # Hardcode driver assign for MVP
                            "start_time": None,
                            "customer_work_done": False,
                            "driver_work_done": False,
                            "total_hours": 0,
                        }
                        bookings[booking_id] = new_booking

                        # Notify customer
                        await manager.send_personal_message(
                            json.dumps(
                                {"type": "booking_update", "booking": new_booking}
                            ),
                            unified_id,
                        )

                        # Notify driver
                        await manager.send_personal_message(
                            json.dumps({"type": "new_job", "booking": new_booking}),
                            "driver_driver_1",
                        )

                elif msg_type == "start_clock":
                    booking_id = parsed_data.get("booking_id")
                    if (
                        booking_id in bookings
                        and bookings[booking_id]["status"] == "ARRIVED"
                    ):
                        bookings[booking_id]["status"] = "IN_PROGRESS"
                        bookings[booking_id]["start_time"] = datetime.now().isoformat()
                        # broadcast
                        update_msg = json.dumps(
                            {"type": "booking_update", "booking": bookings[booking_id]}
                        )
                        await manager.send_personal_message(update_msg, unified_id)
                        await manager.send_personal_message(
                            update_msg, f"driver_{bookings[booking_id]['driver_id']}"
                        )

                elif msg_type == "work_done":
                    booking_id = parsed_data.get("booking_id")
                    if booking_id in bookings:
                        bookings[booking_id]["customer_work_done"] = True
                        await check_work_completion(booking_id)

            elif client_type == "driver":
                msg_type = parsed_data.get("type")

                if msg_type == "get_current_job":
                    # Send driver their active job on connect
                    active_job = next(
                        (
                            b
                            for b in bookings.values()
                            if b["driver_id"] == client_id
                            and b["status"] != "COMPLETED"
                        ),
                        None,
                    )
                    if active_job:
                        await manager.send_personal_message(
                            json.dumps({"type": "new_job", "booking": active_job}),
                            unified_id,
                        )

                elif msg_type == "location_update":
                    lat = parsed_data.get("lat")
                    lng = parsed_data.get("lng")
                    active_drivers[client_id]["location"] = {"lat": lat, "lng": lng}
                    # relay to customer if assigned
                    active_booking = next(
                        (
                            b
                            for b in bookings.values()
                            if b["driver_id"] == client_id
                            and b["status"] in ["EN_ROUTE", "ARRIVED", "IN_PROGRESS"]
                        ),
                        None,
                    )
                    if active_booking:
                        await manager.send_personal_message(
                            json.dumps(
                                {"type": "driver_location", "lat": lat, "lng": lng}
                            ),
                            f"customer_{active_booking['customer_id']}",
                        )

                elif msg_type == "update_status":
                    booking_id = parsed_data.get("booking_id")
                    new_status = parsed_data.get("status")
                    if booking_id in bookings:
                        old_status = bookings[booking_id]["status"]
                        bookings[booking_id]["status"] = new_status

                        if (
                            new_status == "ACCEPTED"
                            and old_status == "WAITING_FOR_DISPATCH"
                        ):
                            msg = "Your driver has accepted the booking!"
                            c_id = bookings[booking_id]["customer_id"]
                            if c_id in customer_sessions:
                                customer_sessions[c_id]["history"].append(
                                    {"role": "assistant", "content": msg}
                                )
                            await manager.send_personal_message(
                                json.dumps({"type": "bot_message", "text": msg}),
                                f"customer_{c_id}",
                            )
                        elif new_status == "EN_ROUTE" and old_status == "ACCEPTED":
                            msg = "Your driver is now traveling to your location! A live tracker has been enabled below."
                            c_id = bookings[booking_id]["customer_id"]
                            if c_id in customer_sessions:
                                customer_sessions[c_id]["history"].append(
                                    {"role": "assistant", "content": msg}
                                )
                            await manager.send_personal_message(
                                json.dumps({"type": "bot_message", "text": msg}),
                                f"customer_{c_id}",
                            )

                        update_msg = json.dumps(
                            {"type": "booking_update", "booking": bookings[booking_id]}
                        )
                        await manager.send_personal_message(
                            update_msg,
                            f"customer_{bookings[booking_id]['customer_id']}",
                        )
                        await manager.send_personal_message(update_msg, unified_id)

                elif msg_type == "request_work_done":
                    booking_id = parsed_data.get("booking_id")
                    if booking_id in bookings:
                        bookings[booking_id]["driver_work_done"] = True
                        # prompt customer
                        await manager.send_personal_message(
                            json.dumps(
                                {
                                    "type": "bot_message",
                                    "text": "Driver has requested to end the job. Please confirm Work Done.",
                                }
                            ),
                            f"customer_{bookings[booking_id]['customer_id']}",
                        )
                        await check_work_completion(booking_id)

    except WebSocketDisconnect:
        manager.disconnect(unified_id)


async def check_work_completion(booking_id: str):
    b = bookings.get(booking_id)
    if b and b.get("customer_work_done") and b.get("driver_work_done"):
        b["status"] = "COMPLETED"
        # calculate dummy hours for MVP, in real life we calculate diff from start_time
        # MVP: random or 1 for simplicity, or real diff
        import math

        try:
            start_dt = datetime.fromisoformat(b["start_time"])
            diff = datetime.now() - start_dt
            # For MVP clarity, let's round up to the nearest hour, minimum 1 hour.
            hours = diff.total_seconds() / 3600
            b["total_hours"] = max(1.0, float(math.ceil(hours)))
        except:
            b["total_hours"] = 1.0

        # Calculate bill : Total Hours * Base Rate
        b["final_bill"] = round(b["total_hours"] * b["vehicle"]["rate"], 2)

        update_msg = json.dumps({"type": "booking_completed", "booking": b})
        await manager.send_personal_message(update_msg, f"customer_{b['customer_id']}")
        await manager.send_personal_message(update_msg, f"driver_{b['driver_id']}")
