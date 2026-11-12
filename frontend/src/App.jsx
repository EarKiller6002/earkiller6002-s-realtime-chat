import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (!trimmedName) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/${encodeURIComponent(trimmedName)}`);

    socket.onopen = () => {
      setIsJoined(true);
      setMessages([
        {
          type: 'system',
          text: `Вы вошли в чат как ${trimmedName}`,
          timestamp: new Date().toLocaleTimeString('ru-RU'),
        },
      ]);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    socket.onclose = () => {
      setIsJoined(false);
    };

    wsRef.current = socket;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({ text: inputText }));
    setInputText('');
  };

  const handleLeave = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsJoined(false);
    setMessages([]);
  };

  if (!isJoined) {
    return (
      <div className="container">
        <div className="login-card">
          <h2>Вход в чат ИрКиллера6002</h2>
          <form onSubmit={handleJoin} className="login-form">
            <input
              type="text"
              placeholder="Введите ваше имя..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit">Подключиться</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="chat-window">
        <header className="chat-header">
          <div>
            <strong>Чат в реальном времени</strong>
            <span className="badge">Вы: {username}</span>
          </div>
          <button onClick={handleLeave} className="leave-btn">
            Выйти
          </button>
        </header>

        <div className="messages-list">
          {messages.map((msg, index) => {
            if (msg.type === 'system') {
              return (
                <div key={index} className="message system-message">
                  <span>{msg.text}</span>
                  <small className="timestamp">{msg.timestamp}</small>
                </div>
              );
            }

            const isOwn = msg.username === username;
            return (
              <div
                key={index}
                className={`message user-message ${isOwn ? 'own-message' : ''}`}
              >
                <div className="message-header">
                  <strong>{isOwn ? 'Вы' : msg.username}</strong>
                  <small className="timestamp">{msg.timestamp}</small>
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="input-form">
          <input
            type="text"
            placeholder="Напишите сообщение..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit">Отправить</button>
        </form>
      </div>
    </div>
  );
}

export default App;
