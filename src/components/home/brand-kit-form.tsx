'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BrandKit } from '@/lib/spec/types';

interface BrandKitFormProps {
  brandKit: BrandKit;
  onChange: (brandKit: BrandKit) => void;
}

export function BrandKitForm({ brandKit, onChange }: BrandKitFormProps) {
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Brand Kit (Optional)</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Primary Font</Label>
          <Input
            placeholder="Inter"
            value={brandKit.primaryFont || ''}
            onChange={(e) =>
              onChange({ ...brandKit, primaryFont: e.target.value || undefined })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Primary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-12 h-9 p-1 cursor-pointer"
              value={brandKit.primaryColor || '#3b82f6'}
              onChange={(e) =>
                onChange({ ...brandKit, primaryColor: e.target.value })
              }
            />
            <Input
              value={brandKit.primaryColor || '#3b82f6'}
              onChange={(e) =>
                onChange({ ...brandKit, primaryColor: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Secondary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-12 h-9 p-1 cursor-pointer"
              value={brandKit.secondaryColor || '#8b5cf6'}
              onChange={(e) =>
                onChange({ ...brandKit, secondaryColor: e.target.value })
              }
            />
            <Input
              value={brandKit.secondaryColor || '#8b5cf6'}
              onChange={(e) =>
                onChange({ ...brandKit, secondaryColor: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
