import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceAssistantProps {
  instructorFirstName?: string;
  nextLesson?: {
    id?: string;
    pupil_id?: string;
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
  const [wakeActive, setWakeActive] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const wakeRef = useRef<any>(null);
  const wakeActiveRef = useRef(false);
  // Handlers are stored in refs so callbacks stay stable
  const handleCommandRef = useRef<(text: string) => void>(() => {});
  const activateRef = useRef<() => void>(() => {});
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

    // ---- "Hey ED" wake word: continuous background recognition ----
    let stopped = false;
    const wake = new SpeechRecognitionCtor();
    wake.continuous = true;
    wake.interimResults = true;
    wake.lang = 'en-GB';
    wakeRef.current = wake;

    wake.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = String(event.results[i][0].transcript).toLowerCase();
        if (
          t.includes('hey ed') ||
          t.includes('hey e d') ||
          t.includes('hey eddie') ||
          t.includes('hey edie')
        ) {
          try { wake.stop(); } catch { /* noop */ }
          wakeActiveRef.current = false;
          setWakeActive(false);
          activateRef.current();
          return;
        }
      }
    };
    wake.onend = () => {
      // Restart continuous listening unless ED is currently active
      if (!stopped && wakeActiveRef.current) {
        try { wake.start(); } catch { /* noop */ }
      }
    };
    wake.onerror = (e: any) => {
      if (e?.error === 'no-speech' || e?.error === 'aborted') return;
      setTimeout(() => {
        if (stopped || !wakeActiveRef.current) return;
        try { wake.start(); } catch { /* noop */ }
      }, 1000);
    };

    try { wake.start(); } catch { /* noop */ }
    wakeActiveRef.current = true;
    setWakeActive(true);

    return () => {
      stopped = true;
      try { recognition.stop(); } catch { /* noop */ }
      try { wake.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
      wakeRef.current = null;
      wakeActiveRef.current = false;
      setWakeActive(false);
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
    // Pause wake-word listening while ED speaks / listens
    wakeActiveRef.current = false;
    setWakeActive(false);
    try { wakeRef.current?.stop(); } catch { /* noop */ }
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
    // Resume background wake-word listening shortly after
    try { wakeRef.current?.stop(); } catch { /* noop */ }
    setTimeout(() => {
      if (!wakeRef.current) return;
      try {
        wakeRef.current.start();
        wakeActiveRef.current = true;
        setWakeActive(true);
      } catch { /* noop */ }
    }, 500);
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

    // HAS PUPIL PAID (question — must be checked before MARK PAID)
    if ((text.includes('has') && text.includes('paid')) ||
      text.includes('have they paid') ||
      text.includes('payment status') ||
      text.includes('did they pay')) {
      const status = nextLesson?.payment_status;
      const amountDue = Number(nextLesson?.amount_due ?? 0);
      if (status === 'paid') {
        speak(`Yes, ${pupilName} has paid.`);
      } else if (status === 'partial') {
        speak(`${pupilName} has partially paid. There is still £${amountDue} outstanding.`);
      } else if (amountDue > 0) {
        speak(`No, ${pupilName} has not paid. They owe £${amountDue}.`);
      } else {
        speak(`${pupilName}'s payment status is ${status ?? 'unknown'}.`);
      }
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
    if ((text.includes('schedule') ||
      text.includes('today') ||
      text.includes('lessons today')) &&
      !text.includes('earn') &&
      !text.includes('made today') &&
      !text.includes('income') &&
      !text.includes('money')) {
      window.dispatchEvent(new CustomEvent('ed:schedule'));
      speak('Opening your schedule');
      return;
    }

    // ---- PRO RADIO ----
    if (text.includes('stop radio') ||
      text.includes('pause radio') ||
      text.includes('turn off radio') ||
      text.includes('stop music') ||
      text.includes('pause music')) {
      speak('Stopping radio');
      window.dispatchEvent(new CustomEvent('ed:radio:stop'));
      return;
    }

    if (text.includes('next station') ||
      text.includes('change station') ||
      text.includes('next channel') ||
      text.includes('skip')) {
      speak('Changing station');
      window.dispatchEvent(new CustomEvent('ed:radio:next'));
      return;
    }

    if (text.includes('what is playing') ||
      text.includes("what's playing") ||
      text.includes('what song') ||
      text.includes('what show')) {
      window.dispatchEvent(new CustomEvent('ed:radio:whats'));
      return;
    }

    if (text.includes('radio') ||
      text.includes('play radio') ||
      text.includes('pro radio') ||
      text.includes('music')) {
      speak('Starting Pro Radio');
      window.dispatchEvent(new CustomEvent('ed:radio:play'));
      return;
    }

    // ---- PRO LIVE ----
    if (text.includes('join') ||
      text.includes('join live') ||
      text.includes('join session')) {
      speak('Joining live session');
      window.dispatchEvent(new CustomEvent('ed:live:join'));
      return;
    }

    if (text.includes('live') ||
      text.includes('pro live') ||
      text.includes("what's live") ||
      text.includes('whats live') ||
      text.includes('live session') ||
      text.includes('live now')) {
      speak('Opening Pro Live');
      window.dispatchEvent(new CustomEvent('ed:live:open'));
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

    // NEAREST FUEL
    if (text.includes('fuel') ||
      text.includes('petrol') ||
      text.includes('diesel') ||
      text.includes('garage')) {
      speak('Finding nearest fuel station');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'gas_station' },
      }));
      return;
    }

    // NEAREST TOILET
    if (text.includes('toilet') ||
      text.includes('loo') ||
      text.includes('bathroom') ||
      text.includes('convenience')) {
      speak('Finding nearest toilet');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'toilet' },
      }));
      return;
    }

    // NEAREST FOOD
    if (text.includes('food') ||
      text.includes('cafe') ||
      text.includes('coffee') ||
      text.includes('lunch') ||
      text.includes('eat') ||
      text.includes('hungry')) {
      speak('Finding nearest food');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'restaurant' },
      }));
      return;
    }

    // NEAREST EV CHARGER
    if (text.includes('charger') ||
      text.includes('charging') ||
      text.includes('electric') ||
      text.includes('ev')) {
      speak('Finding nearest EV charger');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'ev' },
      }));
      return;
    }

    // NEAREST PARKING
    if (text.includes('parking') ||
      text.includes('park')) {
      speak('Finding nearest parking');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'parking' },
      }));
      return;
    }

    // NEAREST ATM
    if (text.includes('atm') ||
      text.includes('cash machine') ||
      text.includes('cashpoint') ||
      text.includes('money')) {
      speak('Finding nearest cash machine');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'atm' },
      }));
      return;
    }

    // HOW MUCH DO THEY OWE
    if (text.includes('owe') ||
      text.includes('outstanding') ||
      text.includes('balance')) {
      const amountDue = Number(nextLesson?.amount_due ?? 0);
      if (amountDue > 0) {
        speak(`${pupilName} owes £${amountDue}.`);
      } else {
        speak(`${pupilName} has no outstanding balance.`);
      }
      return;
    }

    // EARNINGS TODAY
    if (text.includes('earn') ||
      text.includes('made today') ||
      text.includes('income') ||
      text.includes('money today')) {
      window.dispatchEvent(new CustomEvent('ed:earnings'));
      return;
    }

    // SUMMARY OF LAST LESSON
    if (text.includes('last lesson') ||
      text.includes('previous lesson') ||
      text.includes('summary') ||
      text.includes('last time')) {
      const notes = nextLesson?.notes;
      if (notes) {
        speak(`Notes from last lesson with ${pupilName}: ${notes}`);
      } else {
        speak(`No notes recorded for ${pupilName}'s last lesson.`);
      }
      return;
    }

    // HOW MANY LESSONS
    if (text.includes('how many lessons') ||
      text.includes('lesson count') ||
      text.includes('how many hours')) {
      window.dispatchEvent(new CustomEvent('ed:lessoncount'));
      return;
    }

    // ENQUIRIES
    if (text.includes('enquir')) {
      window.dispatchEvent(new CustomEvent('ed:enquiries'));
      return;
    }

    // WEATHER
    if (text.includes('weather') ||
      text.includes('temperature') ||
      text.includes('raining') ||
      text.includes('sunny')) {
      if (weatherData?.condition) {
        speak(`Current weather is ${weatherData.condition}, ${Math.round(weatherData.tempC ?? 0)} degrees.`);
      } else {
        speak('Weather data is not available.');
      }
      return;
    }

    // TRAFFIC
    if (text.includes('traffic') ||
      text.includes('route') ||
      text.includes('journey time') ||
      text.includes('how long')) {
      if (trafficData?.status === 'clear') {
        speak(`Route is clear. Journey time is ${trafficData.travelMins} minutes.`);
      } else if (trafficData?.status === 'delay' ||
        trafficData?.status === 'incident') {
        speak(`There is traffic on your route. Journey time is ${trafficData.travelMins} minutes, with a delay of ${trafficData.delayMins} minutes.`);
      } else {
        speak('Traffic data is not available.');
      }
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
    weatherData,
    trafficData,
    speak,
    activate,
    deactivate,
    startListening,
  ]);

  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  useEffect(() => {
    activateRef.current = activate;
  }, [activate]);


  // Responses to async lookups performed by the host screen
  useEffect(() => {
    const pupilName = nextLesson?.pupils?.name?.split(' ')[0] ?? 'your pupil';

    const onEarnings = (e: Event) => {
      const amount = Number((e as CustomEvent).detail?.amount ?? 0);
      speak(`You have earned £${amount.toFixed(2)} today.`);
    };
    const onLessonCount = (e: Event) => {
      const count = Number((e as CustomEvent).detail?.count ?? 0);
      speak(`${pupilName} has had ${count} lesson${count !== 1 ? 's' : ''} with you.`);
    };
    const onEnquiries = (e: Event) => {
      const count = Number((e as CustomEvent).detail?.count ?? 0);
      speak(`You have ${count} unanswered enquir${count !== 1 ? 'ies' : 'y'}.`);
    };

    const onRadioWhats = (e: Event) => {
      const name = (e as CustomEvent).detail?.name ?? 'Pro Radio';
      speak(`Now playing: ${name}`);
    };

    window.addEventListener('ed:earnings:response', onEarnings);
    window.addEventListener('ed:lessoncount:response', onLessonCount);
    window.addEventListener('ed:enquiries:response', onEnquiries);
    window.addEventListener('ed:radio:whats:response', onRadioWhats);
    return () => {
      window.removeEventListener('ed:earnings:response', onEarnings);
      window.removeEventListener('ed:lessoncount:response', onLessonCount);
      window.removeEventListener('ed:enquiries:response', onEnquiries);
      window.removeEventListener('ed:radio:whats:response', onRadioWhats);
    };
  }, [nextLesson, speak]);

  return {
    isSpeaking,
    isListening,
    wakeActive,
    activate,
    deactivate,
    transcript,
    lastCommand,
    supported,
  };

}
