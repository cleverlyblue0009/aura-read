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
  const [isReady, setIsReady] = useState(false);
  const adobeViewRef = useRef<any>(null);

  useEffect(() => {
    if (!documentUrl || !viewerRef.current) return;

    const initializeViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsReady(false);

        // Wait for Adobe DC to be available with timeout
        const adobeTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Adobe SDK timeout")), 10000)
        );
        
        const adobeReady = new Promise((resolve) => {
          const checkAdobeDC = () => {
            if (window.AdobeDC) {
              resolve(true);
            } else {
              setTimeout(checkAdobeDC, 100);
            }
          };
          checkAdobeDC();
        });

        await Promise.race([adobeReady, adobeTimeout]);

        // Configure Adobe PDF Embed
        const adobeDCView = new window.AdobeDC.View({
          clientId: clientId || "85e35211c6c24c5bb8a6c4c8b9a2b4e8", // Better default client ID
          divId: viewerRef.current.id
        });

        adobeViewRef.current = adobeDCView;

        // PDF viewing configuration
        const viewerConfig = {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: true,
          showLeftHandPanel: false,
          showDownloadPDF: true,
          showPrintPDF: true,
          showZoomControl: true,
          enableFormFilling: false,
          showPageControls: true,
          dockPageControls: false,
          showBookmarks: false
        };

        // Set loading timeout before loading PDF
        const loadingTimeoutId = setTimeout(() => {
          console.log("PDF loading timeout reached");
          setIsLoading(false);
          setIsReady(true);
        }, 8000);

        // Register event listeners first
        adobeDCView.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            console.log('Adobe PDF Event:', event.type, event.data);
            switch (event.type) {
              case "PAGE_VIEW":
                if (onPageChange) {
                  onPageChange(event.data.pageNumber);
                }
                break;
              case "TEXT_SELECTION":
                if (onTextSelection && event.data.selection) {
                  onTextSelection(
                    event.data.selection.text,
                    event.data.selection.pageNumber
                  );
                }
                break;
              case "DOCUMENT_OPEN":
              case "APP_RENDERING_DONE":
                console.log("PDF document loaded successfully");
                clearTimeout(loadingTimeoutId);
                setIsLoading(false);
                setIsReady(true);
                break;
              case "DOCUMENT_ERROR":
              case "APP_RENDERING_FAILED":
                console.error("PDF document error:", event.data);
                clearTimeout(loadingTimeoutId);
                setError("Failed to load PDF document");
                setIsLoading(false);
                setIsReady(false);
                break;
            }
          },
          { enablePDFAnalytics: false }
        );

        // Load the PDF after setting up callbacks
        await adobeDCView.previewFile({
          content: { location: { url: documentUrl } },
          metaData: { fileName: documentName }
        }, viewerConfig);

      } catch (err) {
        console.error("Error initializing Adobe PDF viewer:", err);
        setError(`Failed to initialize PDF viewer: ${err.message}`);
        setIsLoading(false);
        setIsReady(false);
      }
    };

    initializeViewer();

    // Cleanup
    return () => {
      if (adobeViewRef.current) {
        try {
          adobeViewRef.current.destroy();
        } catch (err) {
          console.warn("Error destroying Adobe PDF viewer:", err);
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <div className="text-center">
              <div className="text-lg font-medium text-text-primary">Loading PDF...</div>
              <div className="text-sm text-text-secondary mt-1">Please wait while the document loads</div>
            </div>
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