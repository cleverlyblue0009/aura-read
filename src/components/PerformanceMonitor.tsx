import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface PerformanceMetrics {
  navigationTime: number;
  apiResponseTime: number;
  renderTime: number;
  cacheHitRate: number;
  totalRequests: number;
  slowRequests: number;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showDetails?: boolean;
}

export function PerformanceMonitor({ 
  onMetricsUpdate, 
  showDetails = false 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    navigationTime: 0,
    apiResponseTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    slowRequests: 0
  });
  
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  // Monitor navigation performance
  const measureNavigation = useCallback((startTime: number) => {
    const endTime = performance.now();
    const navigationTime = endTime - startTime;
    
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        navigationTime: Math.min(prev.navigationTime || navigationTime, navigationTime)
      };
      
      // Track history for trends
      setPerformanceHistory(prev => [...prev.slice(-9), newMetrics]);
      
      // Check if navigation is within 2-second requirement
      if (navigationTime > 2000) {
        console.warn(`Navigation took ${navigationTime.toFixed(2)}ms - exceeds 2-second requirement`);
      }
      
      return newMetrics;
    });
    
    return navigationTime;
  }, []);

  // Monitor API response times
  const measureApiResponse = useCallback((responseTime: number) => {
    setMetrics(prev => ({
      ...prev,
      apiResponseTime: Math.min(prev.apiResponseTime || responseTime, responseTime),
      totalRequests: prev.totalRequests + 1,
      slowRequests: prev.slowRequests + (responseTime > 2000 ? 1 : 0)
    }));
  }, []);

  // Monitor render performance
  const measureRenderTime = useCallback((renderTime: number) => {
    setMetrics(prev => ({
      ...prev,
      renderTime: Math.min(prev.renderTime || renderTime, renderTime)
    }));
  }, []);

  // Update cache hit rate
  const updateCacheStats = useCallback((hitRate: number) => {
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hitRate
    }));
  }, []);

  // Expose monitoring functions globally
  useEffect(() => {
    (window as any).performanceMonitor = {
      measureNavigation,
      measureApiResponse,
      measureRenderTime,
      updateCacheStats
    };

    return () => {
      delete (window as any).performanceMonitor;
    };
  }, [measureNavigation, measureApiResponse, measureRenderTime, updateCacheStats]);

  // Notify parent component of metrics updates
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  // Auto-clear old metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        navigationTime: Math.max(0, prev.navigationTime - 100),
        apiResponseTime: Math.max(0, prev.apiResponseTime - 100),
        renderTime: Math.max(0, prev.renderTime - 100)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const getPerformanceStatus = () => {
    const avgNavigationTime = performanceHistory.length > 0 
      ? performanceHistory.reduce((sum, m) => sum + m.navigationTime, 0) / performanceHistory.length
      : metrics.navigationTime;

    if (avgNavigationTime < 1000) return 'excellent';
    if (avgNavigationTime < 2000) return 'good';
    if (avgNavigationTime < 3000) return 'warning';
    return 'poor';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Zap className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const performanceStatus = getPerformanceStatus();

  if (!showDetails) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Badge 
          variant="outline" 
          className={`${getStatusColor(performanceStatus)} flex items-center gap-1`}
        >
          {getStatusIcon(performanceStatus)}
          <span className="text-xs font-medium">
            {metrics.navigationTime > 0 ? `${metrics.navigationTime.toFixed(0)}ms` : 'Ready'}
          </span>
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-surface-elevated rounded-lg shadow-lg border border-border-subtle p-4 min-w-64">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-primary" />
          <h3 className="text-sm font-semibold">Performance Monitor</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMonitoring(!isMonitoring)}
          className="h-6 w-6 p-0"
        >
          {isMonitoring ? '⏸️' : '▶️'}
        </Button>
      </div>

      <div className="space-y-2">
        {/* Navigation Performance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Navigation:</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={`text-xs font-mono ${
              metrics.navigationTime > 2000 ? 'text-red-500' : 
              metrics.navigationTime > 1000 ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {metrics.navigationTime > 0 ? `${metrics.navigationTime.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
        </div>

        {/* API Response Time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">API Response:</span>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span className={`text-xs font-mono ${
              metrics.apiResponseTime > 2000 ? 'text-red-500' : 
              metrics.apiResponseTime > 1000 ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {metrics.apiResponseTime > 0 ? `${metrics.apiResponseTime.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Render Time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Render:</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span className={`text-xs font-mono ${
              metrics.renderTime > 100 ? 'text-red-500' : 
              metrics.renderTime > 50 ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {metrics.renderTime > 0 ? `${metrics.renderTime.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Cache Hit Rate:</span>
          <span className="text-xs font-mono text-blue-500">
            {metrics.cacheHitRate > 0 ? `${(metrics.cacheHitRate * 100).toFixed(0)}%` : 'N/A'}
          </span>
        </div>

        {/* Request Stats */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Requests:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-green-500">
              {metrics.totalRequests - metrics.slowRequests}
            </span>
            <span className="text-xs text-text-tertiary">/</span>
            <span className="text-xs font-mono text-text-primary">
              {metrics.totalRequests}
            </span>
            {metrics.slowRequests > 0 && (
              <span className="text-xs font-mono text-red-500">
                ({metrics.slowRequests} slow)
              </span>
            )}
          </div>
        </div>

        {/* Performance Status */}
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Status:</span>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(performanceStatus)} text-xs`}
            >
              {getStatusIcon(performanceStatus)}
              {performanceStatus.charAt(0).toUpperCase() + performanceStatus.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Performance Trend */}
        {performanceHistory.length > 1 && (
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Trend:</span>
              <div className="flex items-center gap-1">
                {performanceHistory.slice(-5).map((metric, index) => (
                  <div
                    key={index}
                    className={`w-1 h-4 rounded ${
                      metric.navigationTime < 1000 ? 'bg-green-400' :
                      metric.navigationTime < 2000 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ height: `${Math.min(metric.navigationTime / 50, 16)}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}