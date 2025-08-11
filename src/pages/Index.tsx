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

  if (showReader && documents.length > 0) {
    return (
      <PDFReader 
        documents={documents}
        persona={persona}
        jobToBeDone={jobToBeDone}
        onBack={handleBack}
      />
    );
  }

  return <LandingPage onStart={handleStart} />;
};

export default Index;
