const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface DocumentInfo {
  id: string;
  name: string;
  title: string;
  outline: OutlineItem[];
  language: string;
  upload_timestamp: string;
}

export interface OutlineItem {
  level: string;
  text: string;
  page: number;
}

export interface RelatedSection {
  document: string;
  section_title: string;
  page_number: number;
  relevance_score: number;
  explanation: string;
}

export interface Insight {
  type: 'takeaway' | 'fact' | 'contradiction' | 'connection' | 'info' | 'error';
  content: string;
}

export interface ReadingProgress {
  progress_percentage: number;
  time_spent_minutes: number;
  estimated_remaining_minutes: number;
  estimated_total_minutes: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async uploadPDFs(files: File[]): Promise<DocumentInfo[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/upload-pdfs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocuments(): Promise<DocumentInfo[]> {
    const response = await fetch(`${this.baseUrl}/documents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteDocument(docId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/documents/${docId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }

  async analyzeDocuments(documentIds: string[], persona: string, jobToBeDone: string) {
    const response = await fetch(`${this.baseUrl}/analyze-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_ids: documentIds,
        persona,
        job_to_be_done: jobToBeDone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getRelatedSections(
    documentIds: string[],
    currentPage: number,
    currentSection: string,
    persona: string,
    jobToBeDone: string
  ): Promise<RelatedSection[]> {
    const response = await fetch(`${this.baseUrl}/related-sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_ids: documentIds,
        current_page: currentPage,
        current_section: currentSection,
        persona,
        job_to_be_done: jobToBeDone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get related sections: ${response.statusText}`);
    }

    const data = await response.json();
    return data.related_sections;
  }

  async generateInsights(
    text: string,
    persona: string,
    jobToBeDone: string,
    documentContext?: string
  ): Promise<Insight[]> {
    const response = await fetch(`${this.baseUrl}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        persona,
        job_to_be_done: jobToBeDone,
        document_context: documentContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate insights: ${response.statusText}`);
    }

    const data = await response.json();
    return data.insights;
  }

  async generatePodcast(
    text: string,
    relatedSections: string[],
    insights: string[]
  ): Promise<{ script: string; audio_url: string }> {
    const response = await fetch(`${this.baseUrl}/podcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        related_sections: relatedSections,
        insights,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate podcast: ${response.statusText}`);
    }

    return response.json();
  }

  async simplifyText(text: string, difficultyLevel: string = 'simple'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/simplify-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        difficulty_level: difficultyLevel,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to simplify text: ${response.statusText}`);
    }

    const data = await response.json();
    return data.simplified_text;
  }

  async defineTerm(term: string, context: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/define-term`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        term,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to define term: ${response.statusText}`);
    }

    const data = await response.json();
    return data.definition;
  }

  async trackReadingProgress(
    docId: string,
    currentPage: number,
    totalPages: number,
    timeSpent: number
  ): Promise<ReadingProgress> {
    const formData = new FormData();
    formData.append('doc_id', docId);
    formData.append('current_page', currentPage.toString());
    formData.append('total_pages', totalPages.toString());
    formData.append('time_spent', timeSpent.toString());

    const response = await fetch(`${this.baseUrl}/reading-progress`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to track progress: ${response.statusText}`);
    }

    return response.json();
  }

  async getPageContent(docId: string, pageNum: number): Promise<{page: number, content: string, total_pages: number}> {
    const response = await fetch(`${this.baseUrl}/documents/${docId}/page/${pageNum}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get page content: ${response.statusText}`);
    }

    return response.json();
  }

  async getSectionContent(docId: string, startPage: number, endPage?: number): Promise<{start_page: number, end_page: number, content: string}> {
    const url = `${this.baseUrl}/documents/${docId}/section?start_page=${startPage}${endPage ? `&end_page=${endPage}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to get section content: ${response.statusText}`);
    }

    return response.json();
  }

  getPDFUrl(docId: string): string {
    return `${this.baseUrl}/pdf/${docId}`;
  }

  getAudioUrl(filename: string): string {
    if (filename === "browser-tts-fallback") {
      return filename; // Special case for browser TTS
    }
    return `${this.baseUrl}/audio/${filename}`;
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

export const apiService = new ApiService();