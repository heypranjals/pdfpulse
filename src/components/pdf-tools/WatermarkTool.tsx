import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function WatermarkTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('CONFIDENTIAL');
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleWatermark = async () => {
    const mergedPdf = await PDFDocument.create();
    const helvetica = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - (text.length * 5),
          y: height / 2,
          size: 48,
          font: helvetica,
          color: rgb(0.75, 0.75, 0.75),
          rotate: page.getRotation(),
          opacity: 0.5,
        });
        const [copied] = await mergedPdf.copyPages(pdf, [i]);
        mergedPdf.addPage(copied);
      }
    }
    const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, 'watermarked.pdf');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Watermark PDF</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDFs to add watermark.</p>
      </div>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        className="border p-1 mb-2"
        placeholder="Watermark text"
      />
      <button
        onClick={handleWatermark}
        disabled={files.length === 0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50"
      >
        Add Watermark
      </button>
    </div>
  );
}
