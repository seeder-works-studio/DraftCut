'use client';

import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface GenerationStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'error';
  error?: string;
}

interface GenerationProgressDialogProps {
  open: boolean;
  steps: GenerationStep[];
  currentStep?: string;
}

export function GenerationProgressDialog({
  open,
  steps,
  currentStep,
}: GenerationProgressDialogProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalSteps = steps.filter((s) => s.status !== 'skipped').length;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">Creating Your Video</DialogTitle>
          <DialogDescription>
            {completedCount === totalSteps
              ? 'All done! Redirecting to editor...'
              : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {steps.map((step, index) => {
            if (step.status === 'skipped') return null;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-opacity ${
                  step.status === 'pending' ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'completed' && (
                    <CheckCircle2 className="size-5 text-green-500" />
                  )}
                  {step.status === 'in-progress' && (
                    <Loader2 className="size-5 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'pending' && (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                  {step.status === 'error' && (
                    <Circle className="size-5 text-red-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{step.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.status === 'error' && step.error ? (
                      <span className="text-red-500">{step.error}</span>
                    ) : (
                      step.description
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-500 ease-out"
            style={{
              width: `${(completedCount / totalSteps) * 100}%`,
            }}
          />
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This may take 30-90 seconds depending on complexity
        </p>
      </DialogContent>
    </Dialog>
  );
}
