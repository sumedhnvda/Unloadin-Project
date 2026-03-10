import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Map, CheckCircle, Clock } from 'lucide-react';

const Driver = () => {
  const [job, setJob] = useState(null);
  const [ws, setWs] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const driverId = 'driver_1'; // hardcoded for MVP
  const watchIdRef = useRef(null);

  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:8000/ws/driver/${driverId}`);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_job' || data.type === 'booking_update') {
        setJob(data.booking);
      } else if (data.type === 'booking_completed') {
         setJob(data.booking);
      }
    };

    websocket.onopen = () => {
      console.log('Driver WS Connected');
      websocket.send(JSON.stringify({ type: 'get_current_job' }));
    };

    setWs(websocket);

    return () => {
      websocket.close();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Watch location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(coords);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'location_update', ...coords }));
        }
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [ws]);

  const updateStatus = (newStatus) => {
    if (ws && job) {
      ws.send(JSON.stringify({ type: 'update_status', booking_id: job.id, status: newStatus }));
    }
  };

  const requestWorkDone = () => {
    if (ws && job) {
      ws.send(JSON.stringify({ type: 'request_work_done', booking_id: job.id }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-xl font-sans">
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-bold">Driver Terminal</h1>
          <p className="text-sm text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online
          </p>
        </div>
        <div className="bg-slate-800 p-2 rounded-lg text-xs leading-tight border border-slate-700">
          {location ? (
            <>
              <div className="text-green-300 font-mono">{location.lat.toFixed(5)}</div>
              <div className="text-green-300 font-mono">{location.lng.toFixed(5)}</div>
            </>
          ) : (
            <span className="text-orange-300">Locating...</span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm mb-4 border border-red-200">
            <strong>GPS Error:</strong> {error}
          </div>
        )}

        {!job ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <MapPin size={32} />
            </div>
            <p className="font-medium text-lg text-slate-700">Waiting for jobs...</p>
            <p className="text-sm">Keep this screen open to receive assignments.</p>
          </div>
        ) : job.status === 'COMPLETED' ? (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded text-green-900 mt-4 shadow-sm">
             <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><CheckCircle /> Job Completed!</h2>
             <p className="mb-1"><strong>Hours Logged:</strong> {job.total_hours.toFixed(2)}h</p>
             <p className="text-xl"><strong>Total Billed:</strong> ₹{job.final_bill}</p>
             <button onClick={() => setJob(null)} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full transition font-semibold">
               Return to Dashboard
             </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mt-2">
            <div className="p-4 border-b border-gray-50 bg-slate-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Job</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">{job.status}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-1">{job.vehicle.name}</h2>
              <p className="text-slate-500 text-sm">Customer: {job.customer_id.slice(0, 4)}...</p>
            </div>

            <div className="p-4 space-y-3 flex flex-col items-center">
              
              {/* Job Actions */}
              {job.status === 'WAITING_FOR_DISPATCH' && (
                <button 
                  onClick={() => updateStatus('ACCEPTED')}
                  className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg hover:bg-blue-400 transition transform hover:-translate-y-1"
                >
                  <CheckCircle size={24} /> Accept Job
                </button>
              )}

              {job.status === 'ACCEPTED' && (
                <button 
                  onClick={() => updateStatus('EN_ROUTE')}
                  className="w-full py-4 bg-yellow-500 text-yellow-950 rounded-xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg hover:bg-yellow-400 transition transform hover:-translate-y-1"
                >
                  <Navigation size={24} /> Start Trip
                </button>
              )}

              {job.status === 'EN_ROUTE' && (
                <button 
                  onClick={() => updateStatus('ARRIVED')}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg hover:bg-blue-500 transition transform hover:-translate-y-1"
                >
                  <Map size={24} /> Arrived at Site
                </button>
              )}

              {job.status === 'ARRIVED' && (
                <div className="text-center p-6 bg-slate-50 text-slate-500 w-full rounded-xl border border-dashed border-slate-300">
                  <Clock className="mx-auto mb-2 text-slate-400" size={32} />
                  <p className="text-sm font-medium">Waiting for customer to Start Clock...</p>
                </div>
              )}

              {job.status === 'IN_PROGRESS' && (
                <>
                  <div className="text-center my-4">
                    <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full mb-2 border border-green-100">
                      <Clock className="text-green-500 animate-spin-slow" size={32} />
                    </div>
                    <p className="text-2xl font-bold text-green-600 font-mono tracking-widest">
                       TIMER ACTIVE
                    </p>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">
                       Since {new Date(job.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <button 
                    onClick={requestWorkDone}
                    disabled={job.driver_work_done}
                    className={`w-full py-4 rounded-xl font-black text-lg flex justify-center items-center gap-2 shadow-sm transition ${
                      job.driver_work_done ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300' : 'bg-red-500 text-white shadow-red-500/30 hover:bg-red-600'
                    }`}
                  >
                    <CheckCircle size={24} />
                    {job.driver_work_done ? 'Requested Work Done' : 'Complete Assignment'}
                  </button>
                  {job.driver_work_done && (
                    <p className="text-xs text-center text-slate-500 mt-2">Waiting for customer to confirm...</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Driver;
