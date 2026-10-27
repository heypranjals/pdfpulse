import React from 'react';

export default function CompressTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const handleCompress = () => {
    alert('Compress functionality not yet implemented.');
  };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Compress PDF</h2>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={e => setFiles(Array.from(e.target.files || []))}
        className="mb-2"
      />
      <ul className="list-disc ml-5 mb-4">
        {files.map((f, i) => (<li key={i}>{f.name}</li>))}
      </ul>
      <button onClick={handleCompress} disabled={files.length===0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50">
        Compress PDFs
      </button>
    </div>
  );
}
