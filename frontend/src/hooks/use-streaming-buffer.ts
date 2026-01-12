import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_RATE = 80; // chars per second
const MIN_BUFFER = 1;
const MAX_BUFFER = 50;

function calculateFlushAmount(bufferLength: number, deltaTime: number): number {
  const normalizedDelta = deltaTime / 16.67;
  const baseAmount = Math.ceil((TARGET_RATE / 60) * normalizedDelta);
  const pressure = Math.min(bufferLength / MAX_BUFFER, 1);

  if (pressure > 0.7) {
    return Math.ceil(baseAmount * (1 + pressure * 2));
  }
  if (pressure < 0.3 && bufferLength > MIN_BUFFER) {
    return Math.max(1, Math.floor(baseAmount * 0.5));
  }
  return Math.max(1, baseAmount);
}

export function useStreamingBuffer(onComplete?: () => void) {
  const stateRef = useRef({
    pendingBuffer: "",
    renderedContent: "",
    lastFlushTime: 0,
    isActive: false,
  });
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [renderedContent, setRenderedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const flushLoopRef = useRef<((timestamp: number) => void) | undefined>(
    undefined
  );

  useEffect(() => {
    flushLoopRef.current = (timestamp: number) => {
      const state = stateRef.current;

      if (!state.isActive && state.pendingBuffer.length === 0) {
        rafRef.current = null;
        setIsStreaming(false);
        onCompleteRef.current?.();
        return;
      }

      const deltaTime = Math.max(timestamp - state.lastFlushTime, 1);
      const shouldFlush =
        deltaTime >= 16.67 || state.pendingBuffer.length >= MAX_BUFFER;

      if (shouldFlush && state.pendingBuffer.length > 0) {
        const flushAmount = calculateFlushAmount(
          state.pendingBuffer.length,
          deltaTime
        );
        const toFlush = state.pendingBuffer.slice(0, flushAmount);
        state.pendingBuffer = state.pendingBuffer.slice(flushAmount);
        state.renderedContent += toFlush;
        state.lastFlushTime = timestamp;
        setRenderedContent(state.renderedContent);
      }

      if (state.isActive || state.pendingBuffer.length > 0) {
        rafRef.current = requestAnimationFrame(flushLoopRef.current!);
      } else {
        rafRef.current = null;
        setIsStreaming(false);
        onCompleteRef.current?.();
      }
    };
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current === null && flushLoopRef.current) {
      stateRef.current.lastFlushTime = performance.now();
      rafRef.current = requestAnimationFrame(flushLoopRef.current);
    }
  }, []);

  const pushToken = useCallback(
    (token: string) => {
      stateRef.current.pendingBuffer += token;
      stateRef.current.isActive = true;
      setIsStreaming(true);
      startLoop();
    },
    [startLoop]
  );

  const complete = useCallback(() => {
    stateRef.current.isActive = false;
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stateRef.current = {
      pendingBuffer: "",
      renderedContent: "",
      lastFlushTime: 0,
      isActive: false,
    };
    setRenderedContent("");
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { pushToken, renderedContent, complete, reset, isStreaming };
}
