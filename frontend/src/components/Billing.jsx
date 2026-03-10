import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2 } from 'lucide-react';

const Billing = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const booking = state?.booking;

  if (!booking) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4">
        <p>No billing data found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-500 underline">Go Home</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
          <CheckCircle2 size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-center text-slate-800 mb-6">Receipt</h1>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-slate-500 font-medium tracking-wide text-sm uppercase">Service</span>
            <span className="font-bold text-slate-800">{booking.vehicle.name}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-slate-500 font-medium tracking-wide text-sm uppercase">Rate</span>
            <span className="font-bold text-slate-800">₹{booking.vehicle.rate} / hr</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-slate-500 font-medium tracking-wide text-sm uppercase">Time Logged</span>
            <span className="font-bold text-slate-800">{booking.total_hours.toFixed(2)} hours</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 mt-2">
            <span className="text-lg font-black text-slate-800">Total</span>
            <span className="text-3xl font-black text-[#075e54]">₹{Math.ceil(booking.final_bill)}</span>
          </div>
        </div>

        <button 
          onClick={() => alert("Redirecting to payment gateway...")} 
          className="w-full bg-[#075e54] text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-800 transition transform hover:-translate-y-1 shadow-lg shadow-emerald-900/20"
        >
          Pay Now
        </button>
      </div>
      <p className="mt-8 text-sm text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
        <FileText size={16} /> Unloadin Earthmovers
      </p>
    </div>
  );
};

export default Billing;
