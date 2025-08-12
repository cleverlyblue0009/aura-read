import { useState } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { PDFReader, PDFDocument } from '@/components/PDFReader';
import { DocumentInfo } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [showReader, setShowReader] = useState(false);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [persona, setPersona] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStart = async (uploadedDocuments: DocumentInfo[], userPersona: string, userJob: string) => {
    console.log('handleStart called with:', { uploadedDocuments, userPersona, userJob });
    
    if (!uploadedDocuments || uploadedDocuments.length === 0) {
      console.error('No documents provided to handleStart');
      toast({
        title: "No documents",
        description: "No documents were provided. Please try uploading again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Convert backend DocumentInfo to frontend PDFDocument format
      const pdfDocs: PDFDocument[] = uploadedDocuments.map((doc, index) => {
        console.log(`Processing document ${index}:`, doc);
        
        if (!doc.outline) {
          console.warn(`Document ${doc.id} has no outline, using empty array`);
        }
        
        return {
          id: doc.id,
          name: doc.name,
          url: `http://localhost:8000/pdf/${doc.id}`, // Use backend PDF endpoint
          outline: (doc.outline || []).map((item, outlineIndex) => ({
            id: outlineIndex.toString(),
            title: item.text,
            level: parseInt(item.level.replace('H', '')) || 1,
            page: item.page || 1
          }))
        };
      });
      
      console.log('Converted PDF documents:', pdfDocs);
      
      setDocuments(pdfDocs);
      setPersona(userPersona);
      setJobToBeDone(userJob);
      setShowReader(true);
      
      toast({
        title: "Success",
        description: `Loaded ${pdfDocs.length} document(s) successfully.`
      });
      
    } catch (error) {
      console.error('Error in handleStart:', error);
      toast({
        title: "Error loading documents",
        description: "Failed to process the uploaded documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    console.log('handleBack called');
    setShowReader(false);
    setDocuments([]);
    setPersona('');
    setJobToBeDone('');
  };

  console.log('Index component state:', { 
    showReader, 
    documentsCount: documents.length, 
    persona, 
    jobToBeDone,
    isLoading 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="text-text-secondary">Processing documents...</p>
        </div>
      </div>
    );
  }

  if (showReader && documents.length > 0) {
    console.log('Rendering PDFReader with documents:', documents);
    return (
      <PDFReader 
        documents={documents}
        persona={persona}
        jobToBeDone={jobToBeDone}
        onBack={handleBack}
      />
    );
  }

  console.log('Rendering LandingPage');
  return <LandingPage onStart={handleStart} />;
};

export default Index;
