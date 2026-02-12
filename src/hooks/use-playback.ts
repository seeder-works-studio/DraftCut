'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';

export function usePlayback() {
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { isPlaying, currentTime, setCurrentTime, setIsPlaying } =
    useEditorStore();
  const spec = useProjectStore((s) => s.spec);
  const duration = spec?.canvas.duration || 0;

  const tick = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const newTime = currentTime + delta;
      if (newTime >= duration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(newTime);
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [currentTime, duration, setCurrentTime, setIsPlaying]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, tick]);

  return { isPlaying, currentTime, duration, setCurrentTime, setIsPlaying };
}
