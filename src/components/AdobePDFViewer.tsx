import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    AdobeDC: any;
  }
}

interface AdobePDFViewerProps {
  documentUrl: string;
  documentName: string;
  onPageChange?: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
  clientId?: string;
}

export function AdobePDFViewer({ 
  documentUrl, 
  documentName, 
  onPageChange, 
  onTextSelection,
  clientId 
}: AdobePDFViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adobeViewRef = useRef<any>(null);
  const hasMarkedLoadedRef = useRef<boolean>(false);
  const safetyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!documentUrl || !viewerRef.current) return;

    const initializeViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        hasMarkedLoadedRef.current = false;

        // Wait for Adobe DC to be available (with timeout)
        const waitForAdobe = new Promise<void>((resolve, reject) => {
          const start = Date.now();
          const maxWaitMs = 8000;
          const check = () => {
            if (window.AdobeDC) {
              resolve();
            } else if (Date.now() - start > maxWaitMs) {
              reject(new Error('AdobeDC failed to load'));
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        await waitForAdobe;

        const adobeDCView = new window.AdobeDC.View({
          clientId: clientId || 'test',
          divId: viewerRef.current.id
        });

        adobeViewRef.current = adobeDCView;

        const viewerConfig = {
          embedMode: 'SIZED_CONTAINER',
          showAnnotationTools: true,
          showLeftHandPanel: false,
          showDownloadPDF: true,
          showPrintPDF: true,
          showZoomControl: true,
          enableFormFilling: false,
          showPageControls: true,
          dockPageControls: false
        } as const;

        // Register event listeners BEFORE previewing file
        adobeDCView.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            switch (event.type) {
              case 'PAGE_VIEW':
                if (onPageChange) onPageChange(event.data.pageNumber);
                if (!hasMarkedLoadedRef.current) {
                  hasMarkedLoadedRef.current = true;
                  setIsLoading(false);
                }
                break;
              case 'TEXT_SELECTION':
                if (onTextSelection && event.data?.selection) {
                  onTextSelection(
                    event.data.selection.text,
                    event.data.selection.pageNumber
                  );
                }
                break;
              case 'DOCUMENT_OPEN':
                if (!hasMarkedLoadedRef.current) {
                  hasMarkedLoadedRef.current = true;
                  setIsLoading(false);
                }
                break;
              case 'DOCUMENT_ERROR':
                setError('Failed to load PDF document');
                setIsLoading(false);
                break;
            }
          },
          { enablePDFAnalytics: false }
        );

        // Safety timeout to ensure overlay clears even if no events fire
        if (safetyTimeoutRef.current) window.clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = window.setTimeout(() => {
          if (!hasMarkedLoadedRef.current) {
            setIsLoading(false);
          }
        }, 5000);

        // Load the PDF (await so we can clear loading when promise resolves)
        await adobeDCView
          .previewFile(
            {
              content: { location: { url: documentUrl } },
              metaData: { fileName: documentName }
            },
            viewerConfig as any
          )
          .then(() => {
            if (!hasMarkedLoadedRef.current) {
              hasMarkedLoadedRef.current = true;
              setIsLoading(false);
            }
          })
          .catch((e: any) => {
            console.error('Adobe previewFile error:', e);
            setError('Failed to load PDF document');
            setIsLoading(false);
          });
      } catch (err) {
        console.error('Error initializing Adobe PDF viewer:', err);
        setError('Failed to initialize PDF viewer');
        setIsLoading(false);
      }
    };

    initializeViewer();

    // Cleanup
    return () => {
      if (safetyTimeoutRef.current) window.clearTimeout(safetyTimeoutRef.current);
      if (adobeViewRef.current) {
        try {
          adobeViewRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying Adobe PDF viewer:', err);
        }
      }
    };
  }, [documentUrl, documentName, clientId]);

  // Generate unique ID for the viewer container
  const viewerId = `adobe-pdf-viewer-${Math.random().toString(36).substr(2, 9)}`;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-elevated rounded-lg border border-border-subtle">
        <div className="text-center space-y-4">
          <div className="text-destructive text-lg font-medium">PDF Loading Error</div>
          <div className="text-text-secondary">{error}</div>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-surface-elevated rounded-lg border border-border-subtle overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-elevated/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="text-text-secondary">Loading PDF...</span>
          </div>
        </div>
      )}
      
      <div 
        id={viewerId}
        ref={viewerRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}

// Fallback PDF viewer for when Adobe API is not available
export function FallbackPDFViewer({ documentUrl, documentName }: { documentUrl: string; documentName: string }) {
  return (
    <div className="h-full flex flex-col bg-surface-elevated rounded-lg border border-border-subtle">
      <div className="p-4 border-b border-border-subtle">
        <h3 className="font-medium text-text-primary">{documentName}</h3>
        <p className="text-sm text-text-secondary">Fallback PDF viewer</p>
      </div>
      
      <div className="flex-1 p-4">
        <iframe
          src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0 rounded"
          title={documentName}
        />
      </div>
    </div>
  );
}