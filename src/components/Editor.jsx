import React from 'react';
import './Editor.css';

function Editor({ value, onChange }) {
  return (
    <div className="editor">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
      />
    </div>
  );
}

export default Editor;