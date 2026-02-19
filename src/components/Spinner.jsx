import React from 'react';
import './Spinner.css';

const Spinner = () => {
  return (
    <div className="spinner-container">
      <div className="spinner-wrapper">
        <div className="spinner-ring" aria-hidden="true">
          <svg viewBox="0 0 48 48" className="spinner-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              className="spinner-track"
              cx="24"
              cy="24"
              r="20"
              strokeWidth="2.5"
            />
            <circle
              className="spinner-head"
              cx="24"
              cy="24"
              r="20"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="75 126"
            />
          </svg>
        </div>
        <p className="spinner-caption">Taking you to your dashboard</p>
      </div>
      <p className="powered-by">Powered by Izzy Tech Team</p>
    </div>
  );
};

export default Spinner;
