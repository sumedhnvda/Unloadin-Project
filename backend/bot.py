import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# We will use the system prompt to enforce behavior and function structure
SYSTEM_PROMPT = """You are the 'Unloadin Bot', an automated earthmoving machinery booking assistant.
Your goal is to be polite, conversational, and collect the following information from the customer:
1. Preferred Language (detect it and reply in it)
2. Location (City/Village/Pincode)
3. Task they need done (e.g., leveling, excavation)
4. The vehicle they want to book.

Here are the ONLY available vehicles and their rates:
{vehicles_list}

Rules:
- Be concise. WhatsApp messages should be short.
- Formulate your response based on the conversation history.
- If you have ALL 4 pieces of information (Language, Location, Task, Vehicle) and the user confirms they want to book, you MUST output a raw JSON block containing exactly the extracted data AND NOTHING ELSE.
- The JSON block MUST be in this exact format, with the exact keys:
  {{"intent": "book", "language": "Hindi", "location": "Pune", "task": "leveling", "vehicle_id": "v1"}}
- Do not output the JSON until the user explicitly picks a vehicle from the list.
- If you don't have all the info yet, just reply conversationally to ask for the missing parts.
"""


class BotLogic:
    def __init__(self, state_store, vehicles_store, manager):
        self.state_store = state_store  # We now store chat histories here
        self.vehicles = vehicles_store
        self.manager = manager

        target_model = os.getenv(
            "LLM_MODEL", "gpt-4o-mini"
        )  # Fallback to gpt-4o-mini or gpt-5-nano
        self.model = target_model

        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "dummy-key-if-not-set")
        )

        # Build vehicle text for prompt
        self.vehicles_text = ""
        for v in self.vehicles:
            self.vehicles_text += (
                f"- ID: {v['id']} | Name: {v['name']} | Rate: ₹{v['rate']}/hr\n"
            )

    async def handle_message(self, client_id: str, text: str):
        # Initialize conversation history
        if client_id not in self.state_store:
            self.state_store[client_id] = {
                "history": [
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT.format(
                            vehicles_list=self.vehicles_text
                        ),
                    }
                ]
            }

            if text == "start":
                welcome_msg = "Welcome to Unloadin Earthmovers! How can I help you today? / मैं आपकी कैसे मदद कर सकता हूँ?"
                self.state_store[client_id]["history"].append(
                    {"role": "assistant", "content": welcome_msg}
                )
                await self.manager.send_personal_message(
                    json.dumps({"type": "bot_message", "text": welcome_msg}),
                    f"customer_{client_id}",
                )
                return None

        # Add user message
        history = self.state_store[client_id]["history"]
        history.append({"role": "user", "content": text})

        try:
            # Call LLM
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Hardcoded to mini for fast testing as "gpt-5-nano" API handles might differ depending on environment
                messages=history,
                temperature=0.3,
            )

            ai_reply = response.choices[0].message.content.strip()

            # Check if AI outputted the booking JSON
            if (
                ai_reply.startswith("{")
                and "intent" in ai_reply
                and "vehicle_id" in ai_reply
            ):
                try:
                    booking_data = json.loads(ai_reply)
                    if booking_data.get("intent") == "book":
                        # Find the vehicle
                        selected_vehicle = next(
                            (
                                v
                                for v in self.vehicles
                                if v["id"] == booking_data["vehicle_id"]
                            ),
                            None,
                        )
                        if selected_vehicle:
                            success_msg = f"Booking confirmed for {selected_vehicle['name']}! Assigning a driver..."
                            history.append(
                                {"role": "assistant", "content": success_msg}
                            )
                            await self.manager.send_personal_message(
                                json.dumps(
                                    {"type": "bot_message", "text": success_msg}
                                ),
                                f"customer_{client_id}",
                            )

                            # Fire event back to main.py
                            return {
                                "event": "create_booking",
                                "vehicle": selected_vehicle,
                                "client_id": client_id,
                            }
                except json.JSONDecodeError:
                    pass  # Fallback if JSON was malformed

            # Normal conversational reply
            history.append({"role": "assistant", "content": ai_reply})
            await self.manager.send_personal_message(
                json.dumps({"type": "bot_message", "text": ai_reply}),
                f"customer_{client_id}",
            )
            return None

        except Exception as e:
            print(f"LLM Error: {e}")
            error_msg = "Sorry, our AI system is currently unavailable. Please check the API key setup."
            await self.manager.send_personal_message(
                json.dumps({"type": "bot_message", "text": error_msg}),
                f"customer_{client_id}",
            )
            return None
