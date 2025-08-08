import { useState } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { PDFReader, PDFDocument } from '@/components/PDFReader';

const Index = () => {
  const [showReader, setShowReader] = useState(false);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [persona, setPersona] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');

  const handleStart = (files: File[], userPersona: string, userJob: string) => {
    // Convert files to mock documents for demo
    const mockDocs: PDFDocument[] = files.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      outline: [
        { id: '1', title: 'Introduction', level: 1, page: 1 },
        { id: '2', title: 'Background', level: 1, page: 3 },
        { id: '3', title: 'Methodology', level: 1, page: 8 },
        { id: '4', title: 'Results', level: 1, page: 15 },
        { id: '5', title: 'Discussion', level: 1, page: 22 },
        { id: '6', title: 'Conclusion', level: 1, page: 28 }
      ]
    }));
    
    setDocuments(mockDocs);
    setPersona(userPersona);
    setJobToBeDone(userJob);
    setShowReader(true);
  };

  const handleBack = () => {
    setShowReader(false);
    setDocuments([]);
  };

  if (showReader) {
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
