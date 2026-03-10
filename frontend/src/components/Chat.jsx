import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MapMock from './MapMock';

const getClientId = () => {
  let id = localStorage.getItem('unloadin_client_id');
  if (!id) {
    id = Math.random().toString(36).substring(7);
    localStorage.setItem('unloadin_client_id', id);
  }
  return id;
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [booking, setBooking] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const clientId = getClientId();

  useEffect(() => {
    // Initial fetch/connect
    const websocket = new WebSocket(`ws://localhost:8000/ws/customer/${clientId}`);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'bot_message') {
        setMessages((prev) => [...prev, { text: data.text, isBot: true }]);
      } 
      else if (data.type === 'booking_update') {
        setBooking(data.booking);
      }
      else if (data.type === 'driver_location') {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }
      else if (data.type === 'booking_completed') {
        setBooking(data.booking);
        // Save to state and navigate to billing
        navigate('/billing', { state: { booking: data.booking } });
      }
    };

    websocket.onopen = () => {
       console.log("Connected to WS");
    };

    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [clientId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !ws) return;

    setMessages((prev) => [...prev, { text: input, isBot: false }]);
    ws.send(JSON.stringify({ type: 'chat_message', text: input }));
    setInput('');
  };

  const startClock = () => {
    if (ws && booking) {
      ws.send(JSON.stringify({ type: 'start_clock', booking_id: booking.id }));
    }
  };

  const confirmWorkDone = () => {
    if (ws && booking) {
      ws.send(JSON.stringify({ type: 'work_done', booking_id: booking.id }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#ece5dd] max-w-md mx-auto shadow-lg relative">
      {/* Header */}
      <div className="bg-[#075e54] text-white p-4 font-bold flex items-center shadow-md">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#075e54] mr-3 overflow-hidden">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=unloadin" alt="Bot" />
        </div>
        <div>
          <h1 className="text-lg">Unloadin Bot</h1>
          <p className="text-xs text-slate-200">Online</p>
        </div>
      </div>

      {/* Booking State Modal (Floating) */}
      {booking && (
        <div className="bg-white m-2 p-3 rounded-lg shadow-md border-l-4 border-[#25d366] text-sm">
          <h3 className="font-bold text-[#075e54] flex justify-between">
            Booking: {booking.vehicle.name}
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">{booking.status}</span>
          </h3>
          
          {/* Tracking */}
          {["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(booking.status) && (
            <MapMock driverLocation={driverLocation} />
          )}

          {/* Action Buttons */}
          <div className="mt-2 flex flex-col gap-2">
            {booking.status === 'ARRIVED' && (
              <button onClick={startClock} className="bg-[#25d366] text-white w-full py-2 rounded-md font-bold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Start Work Clock
              </button>
            )}
            {booking.status === 'IN_PROGRESS' && (
              <div className="text-xs text-gray-500 mb-1">
                Started at: {new Date(booking.start_time).toLocaleTimeString()}
              </div>
            )}
            {["IN_PROGRESS", "ARRIVED"].includes(booking.status) && (
              <button 
                onClick={confirmWorkDone} 
                disabled={booking.customer_work_done}
                className={`w-full py-2 rounded-md font-bold flex items-center justify-center gap-2 transition-colors ${
                  booking.customer_work_done ? 'bg-gray-300' : 'bg-red-500 text-white'
                }`}
              >
                <CheckCircle className="w-4 h-4" /> 
                {booking.customer_work_done ? 'Confirmed Work Done' : 'Confirm Work Done'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                msg.isBot ? 'bg-white text-gray-800 rounded-tl-none' : 'bg-[#dcf8c6] text-gray-800 rounded-tr-none'
              }`}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="bg-[#f0f0f0] p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full px-4 border-none focus:ring-2 focus:ring-[#25d366] outline-none"
        />
        <button type="submit" className="bg-[#075e54] text-white p-3 rounded-full hover:bg-[#128c7e] transition flex-shrink-0">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Chat;
