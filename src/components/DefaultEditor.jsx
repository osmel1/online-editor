import React from 'react';
import './Editor.css';
import { FileIcon } from 'lucide-react'

function DefaultEditor({ fileName, value, onChange }) {
  return (
    <div className="dark-editor">
      <div className="file-name">
        <div className="file-icon">
          <FileIcon />
        </div>
        <div>{fileName}</div></div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
      />
    </div>
  );
}

export default DefaultEditor;
