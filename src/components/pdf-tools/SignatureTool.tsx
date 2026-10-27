import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function SignatureTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [signature, setSignature] = React.useState('');
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleAddSignature = async () => {
    // Placeholder: simply copy PDFs; real implementation would embed signature image.
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copied = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copied.forEach(p => mergedPdf.addPage(p));
    }
    const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, 'signed.pdf');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Signature & Sanitize PDF</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDFs to add a signature.</p>
      </div>
      <textarea
        placeholder="Enter signature text (placeholder)"
        value={signature}
        onChange={e => setSignature(e.target.value)}
        className="border p-1 mb-2 w-full"
      />
      <button
        onClick={handleAddSignature}
        disabled={files.length===0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50"
      >
        Add Signature
      </button>
    </div>
  );
}
