import { useState, useEffect } from 'react'
import DebugMessages from './components/DebugMessages'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    // Determine backend WebSocket URL. 
    // In a real dev loop, we might use a dynamic port from context.
    const backendPort = 10012;
    const wsUrl = `ws://${window.location.hostname}:${backendPort}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setStatus('Connected');
      // Request initial debug messages
      socket.send(JSON.stringify({ type: 'GET_DEBUG_MESSAGES' }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'STATUS') {
        setStatus(data.connected ? 'Connected to DB' : 'DB Connection Pending...');
      } else if (data.type === 'DEBUG_MESSAGES') {
        setMessages(data.data);
      }
    };

    socket.onclose = () => {
      setStatus('Disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('Error');
    };

    return () => socket.close();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dev Frontend Dashboard</h1>
        <div className="status-bar">
          Status: <span className={`status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>
        </div>
      </header>
      <main>
        <section className="message-section">
          <h2>Debug Messages from Backend (Neo4j)</h2>
          <DebugMessages messages={messages} />
        </section>
      </main>
    </div>
  )
}

export default App