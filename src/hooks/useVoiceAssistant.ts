import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceAssistantProps {
  instructorFirstName?: string;
  nextLesson?: {
    id?: string;
    pupils?: { name?: string; phone?: string };
    lesson_time?: string;
    lesson_date?: string;
    pickup_location?: string;
    duration_minutes?: number;
    payment_status?: string;
    amount_due?: number | null;
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  // Handlers are stored in refs so callbacks stay stable
  const handleCommandRef = useRef<(text: string) => void>(() => {});
  const autoListenRef = useRef(false);

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      : undefined;
  const supported = !!SpeechRecognitionCtor;

  // Initialise synthesis
  if (typeof window !== 'undefined' &&
    !synthRef.current) {
    synthRef.current = window.speechSynthesis;
  }

  // Initialise recognition
  useEffect(() => {
    if (!supported) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, [supported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setIsListening(true);
    setTranscript('');
    recognitionRef.current.onresult = (event: any) => {
      const text = event.results[0][0]
        .transcript.toLowerCase().trim();
      setTranscript(text);
      setIsListening(false);
      handleCommandRef.current(text);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    try {
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  }, []);

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

  // Speak a string. listenAfter → start listening when speech ends.
  const speak = useCallback((text: string, listenAfter = false) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getVoice();
    if (voice) utt.voice = voice;
    utt.pitch = 1.0;
    utt.rate = 0.95;
    utt.volume = 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      if (listenAfter && supported) startListening();
    };
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, [getVoice, startListening, supported]);

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

    autoListenRef.current = true;
    speak(brief, true);
  }, [
    instructorFirstName,
    nextLesson,
    trafficData,
    weatherData,
    unreadCount,
    speak,
  ]);

  const deactivate = useCallback(() => {
    autoListenRef.current = false;
    synthRef.current?.cancel();
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const handleCommand = useCallback((text: string) => {
    setLastCommand(text);
    const pupilName =
      nextLesson?.pupils?.name
        ?.split(' ')[0] ?? 'your pupil';
    const phone = nextLesson?.pupils?.phone ?? null;

    // CALL
    if (text.includes('call')) {
      if (phone) {
        speak(`Calling ${pupilName} now`);
        setTimeout(() => {
          window.location.href = `tel:${phone}`;
        }, 1500);
      } else {
        speak(`No phone number for ${pupilName}`);
      }
      return;
    }

    // READ MESSAGES
    if (text.includes('message') ||
      text.includes('messages') ||
      text.includes('read')) {
      if (unreadCount > 0) {
        speak(`You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}. Open the app to read them.`);
      } else {
        speak('No unread messages.');
      }
      return;
    }

    // ON MY WAY
    if (text.includes('on my way') ||
      text.includes('on the way')) {
      window.dispatchEvent(new CustomEvent('ed:onmyway'));
      speak(`Sending message to ${pupilName}: On my way!`);
      return;
    }

    // I'M HERE
    if (text.includes("i'm here") ||
      text.includes('im here') ||
      text.includes('arrived') ||
      text.includes('outside')) {
      window.dispatchEvent(new CustomEvent('ed:imhere'));
      speak(`Sending message to ${pupilName}: I'm outside!`);
      return;
    }

    // RUNNING LATE
    if (text.includes('late') ||
      text.includes('running late')) {
      window.dispatchEvent(new CustomEvent('ed:late'));
      speak(`Opening late notification for ${pupilName}`);
      return;
    }

    // NEXT LESSON / BRIEF
    if (text.includes('next lesson') ||
      text.includes("what's next") ||
      text.includes('tell me') ||
      text.includes('brief')) {
      activate();
      return;
    }

    // MARK PAID
    if (text.includes('paid') ||
      text.includes('mark paid') ||
      text.includes('payment')) {
      window.dispatchEvent(new CustomEvent('ed:markpaid', {
        detail: { lessonId: nextLesson?.id },
      }));
      speak(`Marking ${pupilName}'s lesson as paid`);
      return;
    }

    // END LESSON
    if (text.includes('end lesson') ||
      text.includes('finish lesson') ||
      text.includes('end of lesson')) {
      window.dispatchEvent(new CustomEvent('ed:eol'));
      speak('Opening end of lesson');
      return;
    }

    // SCHEDULE TODAY
    if (text.includes('schedule') ||
      text.includes('today') ||
      text.includes('lessons today')) {
      window.dispatchEvent(new CustomEvent('ed:schedule'));
      speak('Opening your schedule');
      return;
    }

    // STOP
    if (text.includes('stop') ||
      text.includes('cancel') ||
      text.includes('goodbye') ||
      text.includes('bye')) {
      deactivate();
      speak('OK, goodbye');
      return;
    }

    // UNRECOGNISED
    speak('Sorry, I did not understand that. Try saying: call, message, on my way, running late, or stop.');
    setTimeout(() => {
      startListening();
    }, 2500);
  }, [
    nextLesson,
    unreadCount,
    speak,
    activate,
    deactivate,
    startListening,
  ]);

  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  return {
    isSpeaking,
    isListening,
    activate,
    deactivate,
    transcript,
    lastCommand,
    supported,
  };
}
