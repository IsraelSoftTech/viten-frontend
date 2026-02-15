import React, { useEffect } from 'react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import './SuccessMessage.css';

const SuccessMessage = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="success-message">
      <div className="success-content">
        <FaCheckCircle className="success-icon" />
        <span className="success-text">{message}</span>
        <button className="success-close-btn" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default SuccessMessage;
