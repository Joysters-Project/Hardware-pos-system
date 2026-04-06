import React from 'react';
import './SuccessAnim.css';

const SuccessAnim = ({ show, animate, onDismiss, message, subMessage }) => {
  if (!show) return null;

  return (
    <div className={`success-backdrop ${animate ? 'animate' : ''}`} onClick={onDismiss}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ripple-container">
          <div className="ripple ripple-1"></div>
          <div className="ripple ripple-2"></div>
          <div className="ripple ripple-3"></div>
          
          <svg className="success-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44"></circle>
          </svg>
          
          <svg className="success-tick" viewBox="0 0 40 40">
            <path d="M8 20 L17 29 L32 13"></path>
          </svg>
        </div>

        <div className="success-text">
          <h2 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>{message || 'Success!'}</h2>
          {subMessage && <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '15px' }}>{subMessage}</p>}
          <button onClick={onDismiss}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default SuccessAnim;
