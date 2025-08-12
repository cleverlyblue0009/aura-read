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
  accuracy_score?: number;
  confidence_level?: string;
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

// Performance optimization: Request cache
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Performance optimization: Debounced requests
const pendingRequests = new Map<string, Promise<any>>();

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Cache management
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getCachedResponse(cacheKey: string): any | null {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      requestCache.delete(cacheKey);
    }
    return null;
  }

  private setCachedResponse(cacheKey: string, data: any, ttl: number = CACHE_TTL): void {
    requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Debounced request handling
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    params: any = null,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    const fullCacheKey = cacheKey || this.getCacheKey(endpoint, params);
    
    // Check cache first
    const cached = this.getCachedResponse(fullCacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already pending
    if (pendingRequests.has(fullCacheKey)) {
      return pendingRequests.get(fullCacheKey)!;
    }

    // Make the request
    const requestPromise = this.executeRequest<T>(endpoint, options, params, fullCacheKey, ttl);
    pendingRequests.set(fullCacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      pendingRequests.delete(fullCacheKey);
    }
  }

  private async executeRequest<T>(
    endpoint: string, 
    options: RequestInit, 
    params: any,
    cacheKey: string,
    ttl?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (params && options.method !== 'GET') {
      config.body = JSON.stringify(params);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful responses
    this.setCachedResponse(cacheKey, data, ttl);
    
    return data;
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
    return this.makeRequest<DocumentInfo[]>('/documents', { method: 'GET' });
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.makeRequest(`/documents/${docId}`, { method: 'DELETE' });
  }

  async analyzeDocuments(documentIds: string[], persona: string, jobToBeDone: string) {
    return this.makeRequest('/analyze-documents', {
      method: 'POST',
    }, {
      document_ids: documentIds,
      persona,
      job_to_be_done: jobToBeDone,
    }, null, 10 * 60 * 1000); // 10 minutes cache for analysis
  }

  async getRelatedSections(
    documentIds: string[],
    currentPage: number,
    currentSection: string,
    persona: string,
    jobToBeDone: string
  ): Promise<RelatedSection[]> {
    const cacheKey = `related-sections:${documentIds.join(',')}:${currentPage}:${persona}:${jobToBeDone}`;
    
    const data = await this.makeRequest<{ related_sections: RelatedSection[] }>('/related-sections', {
      method: 'POST',
    }, {
      document_ids: documentIds,
      current_page: currentPage,
      current_section: currentSection,
      persona,
      job_to_be_done: jobToBeDone,
    }, cacheKey, 2 * 60 * 1000); // 2 minutes cache for related sections
    
    return data.related_sections;
  }

  async generateInsights(
    text: string,
    persona: string,
    jobToBeDone: string,
    documentContext?: string
  ): Promise<Insight[]> {
    const data = await this.makeRequest<{ insights: Insight[] }>('/insights', {
      method: 'POST',
    }, {
      text,
      persona,
      job_to_be_done: jobToBeDone,
      document_context: documentContext,
    }, null, 1 * 60 * 1000); // 1 minute cache for insights
    
    return data.insights;
  }

  async generatePodcast(
    text: string,
    relatedSections: string[],
    insights: string[]
  ): Promise<{ script: string; audio_url: string; quality?: string; duration_estimate?: number }> {
    return this.makeRequest('/podcast', {
      method: 'POST',
    }, {
      text,
      related_sections: relatedSections,
      insights,
    });
  }

  async generateEnhancedPodcast(
    text: string,
    relatedSections: string[],
    insights: string[]
  ): Promise<{ 
    script: string; 
    audio_sections: Array<{
      title: string;
      audio_url: string;
      duration: number;
      type: string;
    }>;
    quality: string;
    total_duration: number;
  }> {
    return this.makeRequest('/enhanced-podcast', {
      method: 'POST',
    }, {
      text,
      related_sections: relatedSections,
      insights,
    });
  }

  async simplifyText(text: string, difficultyLevel: string = 'simple'): Promise<string> {
    const data = await this.makeRequest<{ simplified_text: string }>('/simplify-text', {
      method: 'POST',
    }, {
      text,
      difficulty_level: difficultyLevel,
    });
    
    return data.simplified_text;
  }

  async defineTerm(term: string, context: string): Promise<string> {
    const data = await this.makeRequest<{ definition: string }>('/define-term', {
      method: 'POST',
    }, {
      term,
      context,
    });
    
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

  getPDFUrl(docId: string): string {
    return `${this.baseUrl}/pdf/${docId}`;
  }

  getAudioUrl(filename: string): string {
    return `${this.baseUrl}/audio/${filename}`;
  }

  async healthCheck() {
    return this.makeRequest('/health', { method: 'GET' }, null, 'health', 30 * 1000); // 30 seconds cache
  }

  // Performance monitoring
  async measureResponseTime<T>(requestFn: () => Promise<T>): Promise<{ data: T; duration: number }> {
    const start = performance.now();
    const data = await requestFn();
    const duration = performance.now() - start;
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`Slow API request: ${duration.toFixed(2)}ms`);
    }
    
    return { data, duration };
  }

  // Cache management utilities
  clearCache(): void {
    requestCache.clear();
  }

  clearCacheForPattern(pattern: string): void {
    for (const key of requestCache.keys()) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys())
    };
  }
}

export const apiService = new ApiService();