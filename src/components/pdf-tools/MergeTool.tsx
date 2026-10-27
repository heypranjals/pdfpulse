import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function MergeTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const {getRootProps, getInputProps} = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleMerge = async () => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(p => mergedPdf.addPage(p));
    }
    const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, 'merged.pdf');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Merge PDF</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDF files here, or click to select.</p>
      </div>
      <ul className="list-disc ml-5 mb-4">
        {files.map((f, i) => (
          <li key={i}>{f.name}</li>
        ))}
      </ul>
      <button
        onClick={handleMerge}
        disabled={files.length < 2}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50"
      >
        Merge PDFs
      </button>
    </div>
  );
}
