import React, { useEffect, useRef } from 'react';
import './Editor.css';
import {
  MDXEditor,
  headingsPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  toolbarPlugin,
  markdownShortcutPlugin,
  listsPlugin,
  linkPlugin,
  quotePlugin,
  frontmatterPlugin,
  diffSourcePlugin,
  tablePlugin,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";

function Editor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      editorRef.current.setMarkdown(value); // Dynamically update the editor content
    }
  }, [value]); // Runs whenever `value` changes

  return (
    <div className="editor">
      <MDXEditor
        ref={editorRef}
        markdown={value} // Initial value
        onChange={onChange}
        plugins={[
          frontmatterPlugin(),
          listsPlugin(),
          linkPlugin(),
          tablePlugin(),
          quotePlugin(),
          headingsPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <DiffSourceToggleWrapper>
                  <UndoRedo />
                </DiffSourceToggleWrapper>
                <BoldItalicUnderlineToggles />
              </>
            ),
          }),
          markdownShortcutPlugin(),
          diffSourcePlugin({
            diffMarkdown: "An older version",
            viewMode: "rich-text",
          }),
        ]}
      />
    </div>
  );
}

export default Editor;
