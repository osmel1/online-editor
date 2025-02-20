import React from 'react';
import './Preview.css';

function Preview({ url }) {
  return (
    <div className="preview">
      <iframe src={url} title="Preview" />
    </div>
  );
}

export default Preview;