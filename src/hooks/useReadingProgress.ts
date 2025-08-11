import { useState, useEffect, useRef } from 'react';
import { apiService, ReadingProgress } from '@/lib/api';

interface UseReadingProgressProps {
  documentId?: string;
  currentPage: number;
  totalPages: number;
  isReading: boolean;
}

export function useReadingProgress({ 
  documentId, 
  currentPage, 
  totalPages, 
  isReading 
}: UseReadingProgressProps) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [timeSpent, setTimeSpent] = useState(0); // in seconds
  const [sessionStartTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef(Date.now());

  // Update time spent when reading
  useEffect(() => {
    if (isReading) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
        setTimeSpent(prev => prev + elapsed);
        lastUpdateRef.current = now;
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReading]);

  // Track progress when page changes or periodically
  useEffect(() => {
    if (!documentId || totalPages === 0) return;

    const trackProgress = async () => {
      try {
        const progressData = await apiService.trackReadingProgress(
          documentId,
          currentPage,
          totalPages,
          timeSpent
        );
        setProgress(progressData);
      } catch (error) {
        console.error('Failed to track reading progress:', error);
      }
    };

    // Track immediately on page change
    trackProgress();

    // Track periodically while reading
    if (isReading) {
      const progressInterval = setInterval(trackProgress, 30000); // Every 30 seconds
      return () => clearInterval(progressInterval);
    }
  }, [documentId, currentPage, totalPages, timeSpent, isReading]);

  const getReadingStats = () => {
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    const pagesRead = currentPage;
    const avgTimePerPage = pagesRead > 0 ? timeSpent / pagesRead : 0;
    const estimatedTotalTime = avgTimePerPage * totalPages;
    const remainingTime = Math.max(0, estimatedTotalTime - timeSpent);

    return {
      sessionTime,
      timeSpent,
      pagesRead,
      avgTimePerPage,
      estimatedTotalTime,
      remainingTime,
      progressPercentage: totalPages > 0 ? (currentPage / totalPages) * 100 : 0
    };
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return {
    progress,
    timeSpent,
    getReadingStats,
    formatTime
  };
}