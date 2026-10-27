import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function SplitTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [range, setRange] = React.useState('1-'); // e.g., "1-3" or "" for all pages
  const {getRootProps, getInputProps} = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleSplit = async () => {
    const zip = new JSZip();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const total = pdf.getPageCount();
      const [startStr, endStr] = range.split('-');
      const start = startStr ? parseInt(startStr, 10) - 1 : 0;
      const end = endStr ? parseInt(endStr, 10) - 1 : total - 1;
      const pages = [...Array(total).keys()].slice(start, end + 1);
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(pdf, pages);
      copied.forEach(p => newPdf.addPage(p));
      const blob = new Blob([await newPdf.save() as unknown as BlobPart], {type: 'application/pdf'});
      zip.file(`${file.name.replace(/\.pdf$/i, '')}_part.pdf`, blob);
    }
    const content = await zip.generateAsync({type: 'blob'});
    saveAs(content, 'split_parts.zip');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Split PDF</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDFs to split.</p>
      </div>
      <input
        type="text"
        placeholder="Page range (e.g., 1-3)"
        value={range}
        onChange={e => setRange(e.target.value)}
        className="border p-1 mb-2"
      />
      <button
        onClick={handleSplit}
        disabled={files.length === 0}
        className="px-4 py-2 bg-primary-light text-white rounded"
      >
        Split PDFs
      </button>
    </div>
  );
}
