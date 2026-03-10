import React from 'react';
import { MapPin } from 'lucide-react';

const MapMock = ({ driverLocation }) => {
  return (
    <div className="mt-2 text-center rounded overflow-hidden">
      <div className="w-full h-32 bg-sky-100 flex items-center justify-center relative border border-gray-200">
        {/* Fake streets */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="w-full h-1 bg-white absolute top-1/2"></div>
        <div className="w-1 h-full bg-white absolute left-1/3"></div>
        
        {driverLocation ? (
          <div className="absolute text-red-500 animate-pulse flex flex-col items-center">
            <MapPin fill="currentColor" size={24} />
            <span className="text-[10px] font-bold bg-white px-1 rounded shadow">Driver</span>
            {/* Show rough lat/lng just to prove real tracking is working */}
            <span className="text-[8px] bg-white text-gray-500 px-1 mt-1 rounded opacity-75">
              {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </span>
          </div>
        ) : (
          <p className="text-gray-500 text-xs">Waiting for driver location...</p>
        )}
      </div>
    </div>
  );
};

export default MapMock;
