import React, { useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import './SuccessMessage.css';

const SuccessMessage = ({ message, onClose }) => {
  useEffect(() => {
    // Total animation time: 3s slide in + 2s stay + 3s slide out = 8s
    const timer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="success-message">
      <div className="success-content">
        <FaCheckCircle className="success-icon" />
        <span className="success-text">{message}</span>
      </div>
    </div>
  );
};

export default SuccessMessage;
