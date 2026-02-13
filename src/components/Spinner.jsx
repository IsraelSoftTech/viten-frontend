import React from 'react';
import './Spinner.css';

const Spinner = () => {
  return (
    <div className="spinner-container">
      <div className="spinner-wrapper">
        <div className="spinner"></div>
      </div>
      <p className="powered-by">Powered by Izzy Tech Team</p>
    </div>
  );
};

export default Spinner;
