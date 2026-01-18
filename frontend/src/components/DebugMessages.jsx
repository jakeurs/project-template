import React from 'react';

const DebugMessages = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return <p>No messages found in Neo4j.</p>;
  }

  return (
    <ul className="message-list">
      {messages.map((msg, index) => (
        <li key={index} className="message-item">
          {msg}
        </li>
      ))}
    </ul>
  );
};

export default DebugMessages;