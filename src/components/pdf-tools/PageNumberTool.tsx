import React from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PageNumberTool() {
  const [files, setFiles] = React.useState<File[]>([]);
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': [] },
    onDrop: accepted => setFiles(prev => [...prev, ...accepted]),
  });

  const handleAddPageNumbers = async () => {
    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const total = pdf.getPageCount();
      const copied = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copied.forEach((page, idx) => {
        const { width } = page.getSize();
        page.drawText(`${idx + 1} / ${total}`, {
          x: width - 50,
          y: 20,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        mergedPdf.addPage(page);
      });
    }
    const blob = new Blob([await mergedPdf.save() as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, 'paged_numbers.pdf');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Add Page Numbers</h2>
      <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag & drop PDFs to add page numbers.</p>
      </div>
      <button
        onClick={handleAddPageNumbers}
        disabled={files.length === 0}
        className="px-4 py-2 bg-primary-light text-white rounded disabled:opacity-50"
      >
        Add Numbers
      </button>
    </div>
  );
}
