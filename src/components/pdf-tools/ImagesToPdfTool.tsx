import React from 'react';

export default function ImagesToPdfTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const handleConvert = () => {
    alert('Images to PDF functionality not yet implemented.');
  };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Images to PDF</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={e => setFiles(Array.from(e.target.files || []))}
        className="mb-2"
      />
      <ul className="list-disc ml-5 mb-4">
        {files.map((f, i) => (<li key={i}>{f.name}</li>))}
      </ul>
      <button onClick={handleConvert} disabled={files.length===0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50">
        Convert to PDF
      </button>
    </div>
  );
}
