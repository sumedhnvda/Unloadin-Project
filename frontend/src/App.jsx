import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Chat from './components/Chat';
import Driver from './components/Driver';
import Billing from './components/Billing';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/billing" element={<Billing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
