import { useCallback, useRef, useState } from 'react';

interface VoiceAssistantProps {
  instructorFirstName?: string;
  nextLesson?: {
    pupils?: { name?: string; phone?: string };
    lesson_time?: string;
    lesson_date?: string;
    pickup_location?: string;
    duration_minutes?: number;
    payment_status?: string;
    notes?: string;
  } | null;
  unreadCount?: number;
  trafficData?: {
    status: 'clear' | 'delay' | 'incident';
    travelMins?: number;
    delayMins?: number;
  } | null;
  weatherData?: {
    condition?: string;
    tempC?: number;
  } | null;
}

export function useVoiceAssistant({
  instructorFirstName = 'there',
  nextLesson = null,
  unreadCount = 0,
  trafficData = null,
  weatherData = null,
}: VoiceAssistantProps) {
  const [isSpeaking, setIsSpeaking] =
    useState(false);
  const synthRef =
    useRef<SpeechSynthesis | null>(null);

  // Initialise synthesis
  if (typeof window !== 'undefined' &&
    !synthRef.current) {
    synthRef.current = window.speechSynthesis;
  }

  // Get best UK English voice
  const getVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    return (
      voices.find(v =>
        v.lang === 'en-GB' && v.localService) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v =>
        v.lang.startsWith('en')) ||
      null
    );
  }, []);

  // Speak a string
  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getVoice();
    if (voice) utt.voice = voice;
    utt.pitch = 1.0;
    utt.rate = 0.95;
    utt.volume = 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, [getVoice]);

  // Build and speak the lesson brief
  const activate = useCallback(() => {
    const name = instructorFirstName;
    const pupilName = nextLesson?.pupils?.name
      ?.split(' ')[0] ?? null;
    const time = nextLesson?.lesson_time
      ?.slice(0, 5) ?? null;
    const pickup =
      nextLesson?.pickup_location ?? null;
    const dur = nextLesson?.duration_minutes
      ? `${nextLesson.duration_minutes / 60} hour${nextLesson.duration_minutes === 60 ? '' : 's'}`
      : null;
    const paid = nextLesson?.payment_status
      === 'paid';

    let brief = `Hi ${name}. `;
    if (pupilName && time) {
      brief += `Your next lesson is with
        ${pupilName} at ${time}. `;
      if (dur) brief += `Duration ${dur}. `;
      if (pickup)
        brief += `Pickup at ${pickup}. `;
      brief += paid
        ? `${pupilName} has paid. `
        : `Payment is outstanding. `;
    } else {
      brief += `You have no upcoming lessons. `;
    }

    if (trafficData?.status === 'delay' ||
      trafficData?.status === 'incident') {
      brief += `Heads up — there is traffic
        on your route. `;
      if (trafficData.travelMins)
        brief += `Journey time is
          ${trafficData.travelMins} minutes. `;
    }

    if (weatherData?.condition) {
      brief += `Weather: ${weatherData.condition}`;
      if (weatherData.tempC !== undefined)
        brief += `, ${Math.round(
          weatherData.tempC)}  degrees`;
      brief += `. `;
    }

    if (unreadCount > 0) {
      brief += `You have ${unreadCount}
        unread message${unreadCount > 1
          ? 's' : ''}. `;
    } else {
      brief += `No new messages. `;
    }

    speak(brief);
  }, [
    instructorFirstName,
    nextLesson,
    trafficData,
    weatherData,
    unreadCount,
    speak,
  ]);

  const deactivate = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isListening: false,
    activate,
    deactivate,
    transcript: '',
    lastCommand: '',
  };
}
