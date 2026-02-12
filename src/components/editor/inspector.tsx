'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { SKILL_REGISTRY } from '@/skills/registry';
import type { Clip } from '@/lib/spec/types';

export function Inspector() {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const spec = useProjectStore((s) => s.spec);
  const updateClip = useProjectStore((s) => s.updateClip);

  const selectedClip = useMemo(() => {
    if (!spec || !selectedClipId) return null;
    for (const track of spec.composition.tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [spec, selectedClipId]);

  if (!selectedClip) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a clip to edit its properties
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h3 className="font-semibold text-sm">
        {selectedClip.type === 'skill' && selectedClip.skillType
          ? SKILL_REGISTRY[selectedClip.skillType]?.name || selectedClip.skillType
          : selectedClip.type}
      </h3>

      {/* Timing */}
      <Card className="p-3 space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Timing</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Start (s)</Label>
            <Input
              type="number"
              step={0.1}
              value={selectedClip.startTime}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  startTime: parseFloat(e.target.value) || 0,
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Duration (s)</Label>
            <Input
              type="number"
              step={0.1}
              min={0.1}
              value={selectedClip.duration}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  duration: parseFloat(e.target.value) || 0.1,
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Skill-specific properties */}
      {selectedClip.type === 'skill' &&
        selectedClip.skillType &&
        selectedClip.skillProps && (
          <SkillPropsEditor
            clip={selectedClip}
            onUpdate={(newProps) =>
              updateClip(selectedClip.id, { skillProps: newProps })
            }
          />
        )}
    </div>
  );
}

function SkillPropsEditor({
  clip,
  onUpdate,
}: {
  clip: Clip;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const skillDef = SKILL_REGISTRY[clip.skillType!];
  if (!skillDef) return null;

  const props = clip.skillProps || {};

  const handleChange = (key: string, value: unknown) => {
    onUpdate({ ...props, [key]: value });
  };

  // Build form fields from the props schema shape
  const shape = skillDef.propsSchema.shape;
  const fields = Object.keys(shape);

  return (
    <Card className="p-3 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Properties</h4>
      {fields.map((key) => {
        const currentValue = props[key];

        // Skip complex array/object props for now (like captions)
        if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
          return null;
        }
        if (Array.isArray(currentValue)) {
          return (
            <div key={key}>
              <Label className="text-xs capitalize">{key}</Label>
              <p className="text-xs text-muted-foreground">[Complex property - edit via JSON]</p>
            </div>
          );
        }

        // Color picker for color-like values
        if (
          typeof currentValue === 'string' &&
          currentValue.match(/^#[0-9a-fA-F]{6}$/)
        ) {
          return (
            <div key={key}>
              <Label className="text-xs capitalize">{key}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={currentValue}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-10 h-8 p-1 cursor-pointer"
                />
                <Input
                  value={currentValue}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
              </div>
            </div>
          );
        }

        // Number input
        if (typeof currentValue === 'number') {
          return (
            <div key={key}>
              <Label className="text-xs capitalize">{key}</Label>
              <Input
                type="number"
                value={currentValue}
                onChange={(e) =>
                  handleChange(key, parseFloat(e.target.value) || 0)
                }
                className="h-8 text-sm"
              />
            </div>
          );
        }

        // Text input
        return (
          <div key={key}>
            <Label className="text-xs capitalize">{key}</Label>
            <Input
              value={String(currentValue ?? '')}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        );
      })}
    </Card>
  );
}
