import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ stage, progress }) => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <h2>Setting up Docusaurus</h2>
        <div className="spinner"></div>
        <p className="stage-text">{stage}</p>
        {progress > 0 && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;