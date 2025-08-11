import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Target } from 'lucide-react';

interface ReadingProgressBarProps {
  currentPage: number;
  totalPages: number;
  timeSpent: number;
  estimatedRemaining: number;
  progressPercentage: number;
  formatTime: (seconds: number) => string;
}

export function ReadingProgressBar({
  currentPage,
  totalPages,
  timeSpent,
  estimatedRemaining,
  progressPercentage,
  formatTime
}: ReadingProgressBarProps) {
  return (
    <div className="bg-surface-elevated/80 backdrop-blur-sm border border-border-subtle rounded-lg p-3 space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Reading Progress</span>
          <span className="text-text-primary font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Page {currentPage}</span>
          <span>of {totalPages}</span>
        </div>
      </div>

      {/* Time Statistics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-blue-500" />
          </div>
          <div className="text-xs text-text-secondary">Time Spent</div>
          <Badge variant="secondary" className="text-xs">
            {formatTime(timeSpent)}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-3 w-3 text-green-500" />
          </div>
          <div className="text-xs text-text-secondary">Remaining</div>
          <Badge variant="outline" className="text-xs">
            {formatTime(estimatedRemaining)}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpen className="h-3 w-3 text-purple-500" />
          </div>
          <div className="text-xs text-text-secondary">Total Est.</div>
          <Badge variant="outline" className="text-xs">
            {formatTime(timeSpent + estimatedRemaining)}
          </Badge>
        </div>
      </div>
    </div>
  );
}