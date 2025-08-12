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
      url: doc.id.startsWith('demo-') 
        ? `data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSA4IFRGCDU3IDcwMCBUZAooSGVsbG8gV29ybGQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgowMDAwMDAwMzI0IDAwMDAwIG4KdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MTcKJSVFT0Y=` // Base64 encoded minimal PDF
        : `http://localhost:8000/pdf/${doc.id}`, // Use backend PDF endpoint
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
