import { useState } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { PDFReader, PDFDocument } from '@/components/PDFReader';
import { DocumentInfo } from '@/lib/api';

const Index = () => {
  const [showReader, setShowReader] = useState(false);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [persona, setPersona] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');

  const handleStart = (uploadedDocuments: DocumentInfo[], userPersona: string, userJob: string) => {
    console.log('handleStart called with:', { uploadedDocuments, userPersona, userJob });
    
    // Only proceed if we have valid documents
    if (!uploadedDocuments || uploadedDocuments.length === 0) {
      console.error('No documents provided to handleStart');
      return;
    }

    // Convert backend DocumentInfo to frontend PDFDocument format
    const pdfDocs: PDFDocument[] = uploadedDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      url: `http://localhost:8000/pdf/${doc.id}`, // Use backend PDF endpoint
      outline: doc.outline.map((item, index) => ({
        id: index.toString(),
        title: item.text,
        level: parseInt(item.level.replace('H', '')),
        page: item.page
      }))
    }));
    
    console.log('Converted PDF documents:', pdfDocs);
    
    setDocuments(pdfDocs);
    setPersona(userPersona);
    setJobToBeDone(userJob);
    setShowReader(true);
  };

  const handleBack = () => {
    setShowReader(false);
    setDocuments([]);
    setPersona('');
    setJobToBeDone('');
  };

  // Debug logging
  console.log('Index state:', { showReader, documentsLength: documents.length, persona, jobToBeDone });

  // Show PDFReader only if we have documents AND showReader is true
  if (showReader) {
    if (documents.length > 0) {
      return (
        <PDFReader 
          documents={documents}
          persona={persona}
          jobToBeDone={jobToBeDone}
          onBack={handleBack}
        />
      );
    } else {
      // Show loading or error state if showReader is true but no documents
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="text-lg font-medium text-text-primary">Loading documents...</div>
            <div className="text-sm text-text-secondary">
              If this persists, please go back and try uploading again.
            </div>
            <button 
              onClick={handleBack}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <LandingPage onStart={handleStart} />;
};

export default Index;
