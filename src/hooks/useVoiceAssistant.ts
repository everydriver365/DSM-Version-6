import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ed_voice_name') ?? null;
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  // "Hey ED" background listening is opt-in — the microphone must never open
  // on its own when the app loads.
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ed_wake_word') === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setWakeWordEnabled(localStorage.getItem('ed_wake_word') === '1');
    window.addEventListener('ed-wake-word-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ed-wake-word-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const wakeRef = useRef<any>(null);
  const wakeActiveRef = useRef(false);
  // Handlers are stored in refs so callbacks stay stable
  const handleCommandRef = useRef<(text: string) => void>(() => {});
  const activateRef = useRef<() => void>(() => {});
  const autoListenRef = useRef(false);
  const lastBriefTime = useRef<number>(0);
  const BRIEF_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds


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
    // Opt-in only: without it the mic stays closed until the user taps it.
    if (!wakeWordEnabled) {
      wakeActiveRef.current = false;
      setWakeActive(false);
      return () => {
        try { recognition.stop(); } catch { /* noop */ }
        recognitionRef.current = null;
      };
    }

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
          t.includes('hey edie') ||
          t.includes('hey every driver') ||
          t.includes('hey every') ||
          t.includes('a ed') ||
          t.includes('hey et') ||
          t.includes('hey at')
        ) {
          try { wake.stop(); } catch { /* noop */ }
          wakeActiveRef.current = false;
          setWakeActive(false);
          // Wake word always just says "Yes?" and listens — never reads the full brief
          speak("Yes?");
          setTimeout(() => {
            startListening();
          }, 800);
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

  // Load available synthesis voices (iOS loads async)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);


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

  // Get best UK English / iOS voice
  const getVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    // Use user's chosen voice if set
    if (selectedVoiceName) {
      const chosen = voices.find(v => v.name === selectedVoiceName);
      if (chosen) return chosen;
    }
    // Fall back to preferred voices
    const preferred = [
      'Daniel',
      'Samantha',
      'Kate',
      'Serena',
      'Martha',
      'Arthur',
    ];
    for (const name of preferred) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    return (
      voices.find(v => v.lang === 'en-GB' && v.localService) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    );
  }, [selectedVoiceName]);

  // Persist user voice preference
  const setVoice = useCallback((name: string | null) => {
    setSelectedVoiceName(name);
    if (name) {
      localStorage.setItem('ed_voice_name', name);
    } else {
      localStorage.removeItem('ed_voice_name');
    }
  }, []);

  // Speak a string. listenAfter → start listening when speech ends.
  const speak = useCallback((text: string, listenAfter = false) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(text);
      const voice = getVoice();
      if (voice) utt.voice = voice;
      utt.pitch = 1.0;
      utt.rate = 0.92;
      utt.volume = 1.0;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => {
        setIsSpeaking(false);
        if (listenAfter && supported) startListening();
      };
      utt.onerror = () => setIsSpeaking(false);
      synthRef.current!.speak(utt);
    };

    // iOS loads voices async — wait for them if needed
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    } else {
      doSpeak();
    }
  }, [getVoice, startListening, supported]);

  // Build the lesson brief string (used by the explicit "daily brief" command)
  const buildBrief = useCallback(() => {
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

    let brief = '';
    if (pupilName && time) {
      brief += `Your next lesson is with
        ${pupilName} at ${time}. `;
      if (dur) brief += `Duration ${dur}. `;
      if (pickup) brief += `Pickup at ${pickup}. `;
      brief += paid
        ? `${pupilName} has paid. `
        : `Payment is outstanding. `;
    } else {
      brief += `You have no upcoming lessons. `;
    }

    if (trafficData?.status === 'delay' ||
      trafficData?.status === 'incident') {
      brief += `Heads up, there is traffic
        on your route. `;
      if (trafficData.travelMins)
        brief += `Journey time is
          ${trafficData.travelMins}
          minutes. `;
    }

    if (weatherData?.condition) {
      brief += `Weather: ${weatherData.condition}`;
      if (weatherData.tempC !== undefined)
        brief += `, ${Math.round(
          weatherData.tempC)} degrees`;
      brief += `. `;
    }

    if (unreadCount > 0) {
      brief += `You have ${unreadCount}
        unread message${unreadCount > 1
          ? 's' : ''}. `;
    } else {
      brief += `No new messages. `;
    }

    return brief;
  }, [
    nextLesson,
    trafficData,
    weatherData,
    unreadCount,
  ]);

  // Activate ED: just say "Yes?" and listen — no automatic brief
  const activate = useCallback(() => {
    speak("Yes?", false);
    setTimeout(() => {
      startListening();
    }, 600);
  }, [speak, startListening]);

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

    // ================= PHASE 5 =================

    // WHO OWES ME MONEY
    if (text.includes('who owes') ||
      text.includes('outstanding payments') ||
      text.includes('overdue') ||
      text.includes('owe me')) {
      window.dispatchEvent(new CustomEvent('ed:owes'));
      return;
    }

    // EARNINGS THIS WEEK
    if (text.includes('this week') &&
      (text.includes('earn') ||
        text.includes('made') ||
        text.includes('income'))) {
      window.dispatchEvent(new CustomEvent('ed:earnings:week'));
      return;
    }

    // EARNINGS THIS MONTH
    if (text.includes('this month') &&
      (text.includes('earn') ||
        text.includes('made') ||
        text.includes('income'))) {
      window.dispatchEvent(new CustomEvent('ed:earnings:month'));
      return;
    }

    // HOW MANY LESSONS TOMORROW
    if (text.includes('tomorrow') &&
      text.includes('lesson') &&
      !text.includes('remind') &&
      !text.includes('send')) {
      window.dispatchEvent(new CustomEvent('ed:tomorrow'));
      return;
    }

    // LAST LESSON TODAY
    if ((text.includes('last lesson') && text.includes('today')) ||
      text.includes('finish today') ||
      text.includes('what time do i finish')) {
      window.dispatchEvent(new CustomEvent('ed:lastlesson'));
      return;
    }

    // HOW MANY PUPILS
    if (text.includes('how many pupils') ||
      text.includes('number of pupils') ||
      text.includes('pupil count')) {
      window.dispatchEvent(new CustomEvent('ed:pupilcount'));
      return;
    }

    // WHEN IS PUPIL'S TEST
    if (text.includes('test') &&
      (text.includes('when') || text.includes('date'))) {
      window.dispatchEvent(new CustomEvent('ed:testdate', {
        detail: { pupilId: nextLesson?.pupil_id },
      }));
      return;
    }

    // HOW MANY HOURS HAS PUPIL DONE
    if (text.includes('how many hours') ||
      text.includes('hours done') ||
      text.includes('lesson hours')) {
      window.dispatchEvent(new CustomEvent('ed:hours', {
        detail: { pupilId: nextLesson?.pupil_id },
      }));
      return;
    }

    // SEND REMINDER TO PUPIL
    if (text.includes('reminder') ||
      text.includes('remind') ||
      (text.includes('send') && text.includes('tomorrow'))) {
      window.dispatchEvent(new CustomEvent('ed:reminder', {
        detail: {
          pupilId: nextLesson?.pupil_id,
          phone: nextLesson?.pupils?.phone,
          name: nextLesson?.pupils?.name?.split(' ')[0],
          date: nextLesson?.lesson_date,
          time: nextLesson?.lesson_time?.slice(0, 5),
        },
      }));
      return;
    }

    // SEND PAYMENT REQUEST
    if (text.includes('payment request') ||
      text.includes('send payment') ||
      text.includes('request payment') ||
      text.includes('payment link')) {
      speak(`Opening a payment request for ${pupilName}`);
      window.dispatchEvent(new CustomEvent('ed:paymentrequest', {
        detail: {
          pupilId: nextLesson?.pupil_id,
          phone: nextLesson?.pupils?.phone,
          name: nextLesson?.pupils?.name?.split(' ')[0],
          amount: nextLesson?.amount_due,
        },
      }));
      return;
    }

    // CONFIRM CANCEL (must precede the cancel branch)
    if (text.includes('yes') && lastCommand.includes('cancel')) {
      window.dispatchEvent(new CustomEvent('ed:cancellesson', {
        detail: { lessonId: nextLesson?.id },
      }));
      speak('Lesson cancelled');
      return;
    }

    // CANCEL LESSON
    if (text.includes('cancel lesson') ||
      text.includes('cancel the lesson') ||
      (text.includes('cancel') && text.includes('lesson'))) {
      speak(`Are you sure you want to cancel ${pupilName}'s lesson? Say yes to confirm or no to cancel.`);
      window.dispatchEvent(new CustomEvent('ed:cancelconfirm'));
      setTimeout(() => startListening(), 3500);
      return;
    }

    // HOW FAR TO NEXT PICKUP
    if (text.includes('how far') ||
      text.includes('distance') ||
      text.includes('how long to get there')) {
      if (trafficData?.travelMins) {
        speak(`It is ${trafficData.travelMins} minutes to ${pupilName}'s pickup location.`);
      } else {
        speak('Route information is not available right now.');
      }
      return;
    }

    // FIND MCDONALD'S
    if (text.includes('mcdonald') ||
      text.includes('maccy') ||
      text.includes('big mac')) {
      speak("Finding nearest McDonald's");
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'mcdonalds' },
      }));
      return;
    }

    // FIND GREGGS
    if (text.includes('greggs') ||
      text.includes('sausage roll')) {
      speak('Finding nearest Greggs');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'greggs' },
      }));
      return;
    }

    // FIND COSTA
    if (text.includes('costa') ||
      text.includes('coffee')) {
      speak('Finding nearest Costa');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'costa' },
      }));
      return;
    }

    // FIND TESCO
    if (text.includes('tesco') ||
      text.includes('supermarket') ||
      text.includes('shops')) {
      speak('Finding nearest Tesco');
      window.dispatchEvent(new CustomEvent('ed:nearest', {
        detail: { type: 'tesco' },
      }));
      return;
    }

    // DRIVING INSTRUCTOR JOKE
    if (text.includes('joke') ||
      text.includes('funny') ||
      text.includes('make me laugh')) {
      const jokes = [
        'Why did the driving instructor cross the road? To get to the other side safely, with full observations.',
        'What did the driving instructor say to the nervous pupil? Just take it one junction at a time.',
        'How many driving instructors does it take to change a lightbulb? Just one, but they have to check their mirrors first.',
        'Why are driving instructors always calm? Because they have dual controls.',
        'What do you call a driving instructor who falls asleep? A passenger.',
      ];
      speak(jokes[Math.floor(Math.random() * jokes.length)]!);
      return;
    }

    // WHAT IS THE NEWS
    if (text.includes('news') ||
      text.includes("what's happening") ||
      text.includes('whats happening')) {
      speak('Opening Pro Live for the latest news');
      window.dispatchEvent(new CustomEvent('ed:live:open'));
      return;
    }

    // BUSIEST DAY THIS WEEK
    if (text.includes('busiest') ||
      text.includes('busy day') ||
      text.includes('most lessons')) {
      window.dispatchEvent(new CustomEvent('ed:busiestday'));
      return;
    }

    // ANY CANCELLATIONS
    if (text.includes('cancellation') ||
      text.includes('cancelled today')) {
      window.dispatchEvent(new CustomEvent('ed:cancellations'));
      return;
    }

    // =============== END PHASE 5 ===============



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

    // DAILY BRIEF
    if (text.includes('daily brief') ||
      text.includes('briefing') ||
      text.includes('my brief') ||
      text.includes('brief me') ||
      text.includes('whats my brief') ||
      text.includes("what's my brief") ||
      text.includes('morning brief') ||
      text.includes('tell me my brief') ||
      text.includes('read my brief')) {
      const brief = buildBrief();
      speak(brief, true);
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
      (window as any).__edRadio?.pause();
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
      const info = (window as any).__edRadio?.nowPlaying;
      if (info) {
        window.dispatchEvent(new CustomEvent('ed:radio:whats:response', {
          detail: { name: info?.title ?? 'PRO Radio' },
        }));
      }
      window.dispatchEvent(new CustomEvent('ed:radio:whats'));
      return;
    }

    if (text.includes('radio') ||
      text.includes('play radio') ||
      text.includes('pro radio') ||
      text.includes('music')) {
      speak('Starting Pro Radio');
      (window as any).__edRadio?.play();
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

    // UNRECOGNISED — ask ED AI
    const getRateLimit = (): { date: string; count: number } => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const stored = localStorage.getItem('ed_ai_limit');
        if (!stored) return { date: today, count: 0 };
        const parsed = JSON.parse(stored);
        if (parsed.date !== today) return { date: today, count: 0 };
        return parsed;
      } catch {
        return { date: today, count: 0 };
      }
    };

    const incrementRateLimit = () => {
      const limit = getRateLimit();
      try {
        localStorage.setItem(
          'ed_ai_limit',
          JSON.stringify({ date: limit.date, count: limit.count + 1 }),
        );
      } catch { /* noop */ }
    };

    const limit = getRateLimit();
    if (limit.count >= 20) {
      speak('You have reached your daily question limit. Try again tomorrow.');
      return;
    }
    incrementRateLimit();

    speak('Let me think about that...');

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          speak('I need you to be logged in to answer questions.');
          return;
        }

        const res = await fetch('/api/ed-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: text,
            context: `isPlaying: ${(window as any).__edRadio?.isPlaying ?? false}`,
          }),
        });

        const data = await res.json();

        if (data?.answer) {
          speak(data.answer, true);
        } else {
          speak('Sorry, I could not get an answer right now.', true);
        }
      } catch {
        speak('Sorry, I am having trouble connecting right now.', true);
      }
    })();
  }, [
    nextLesson,
    unreadCount,
    weatherData,
    trafficData,
    lastCommand,
    speak,
    buildBrief,
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

  // Expose activate so external pages (e.g. ED Settings) can trigger ED
  useEffect(() => {
    (window as any).__edVoice = { activate };
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

    // ---- Phase 5 responses ----
    const d = (e: Event) => (e as CustomEvent).detail ?? {};
    const money = (v: unknown) => Number(v ?? 0).toFixed(2);

    const onOwes = (e: Event) => {
      const list: Array<{ name?: string; amount?: number }> = d(e).pupils ?? [];
      if (!list.length) { speak('Everyone is up to date.'); return; }
      const parts = list.map((p) => `${p.name ?? 'a pupil'}, £${money(p.amount)}`);
      speak(`The following pupils have outstanding payments: ${parts.join('. ')}.`);
    };
    const onEarningsWeek = (e: Event) =>
      speak(`You have earned £${money(d(e).amount)} this week.`);
    const onEarningsMonth = (e: Event) =>
      speak(`You have earned £${money(d(e).amount)} this month.`);
    const onTomorrow = (e: Event) => {
      const { count = 0, firstName, firstTime } = d(e) as { count?: number; firstName?: string; firstTime?: string };
      if (!count) { speak('You have no lessons tomorrow.'); return; }
      speak(`You have ${count} lesson${count !== 1 ? 's' : ''} tomorrow.${firstName ? ` First is ${firstName}${firstTime ? ` at ${firstTime}` : ''}.` : ''}`);
    };
    const onLastLesson = (e: Event) => {
      const { name, time } = d(e) as { name?: string; time?: string };
      if (!name) { speak('You have no more lessons today.'); return; }
      speak(`Your last lesson today is ${name} at ${time ?? 'an unknown time'}.`);
    };
    const onPupilCount = (e: Event) => {
      const count = Number(d(e).count ?? 0);
      speak(`You have ${count} active pupil${count !== 1 ? 's' : ''}.`);
    };
    const onTestDate = (e: Event) => {
      const { name, date } = d(e) as { name?: string; date?: string };
      if (!date) { speak(`No test is booked for ${name ?? pupilName}.`); return; }
      speak(`${name ?? pupilName}'s test is on ${date}.`);
    };
    const onHours = (e: Event) => {
      const { name, hours = 0 } = d(e) as { name?: string; hours?: number };
      speak(`${name ?? pupilName} has done ${hours} hour${hours !== 1 ? 's' : ''} with you.`);
    };
    const onReminder = (e: Event) => {
      const { name, ok = true } = d(e) as { name?: string; ok?: boolean };
      speak(ok ? `Reminder sent to ${name ?? pupilName}.` : `Sorry, I could not send the reminder.`);
    };
    const onBusiestDay = (e: Event) => {
      const { day, count = 0 } = d(e) as { day?: string; count?: number };
      if (!day) { speak('You have no lessons booked this week.'); return; }
      speak(`Your busiest day this week is ${day} with ${count} lesson${count !== 1 ? 's' : ''}.`);
    };
    const onCancellations = (e: Event) => {
      const names: string[] = d(e).names ?? [];
      if (!names.length) { speak('No cancellations today.'); return; }
      speak(`You have ${names.length} cancellation${names.length !== 1 ? 's' : ''} today: ${names.join(', ')}.`);
    };

    window.addEventListener('ed:earnings:response', onEarnings);
    window.addEventListener('ed:lessoncount:response', onLessonCount);
    window.addEventListener('ed:enquiries:response', onEnquiries);
    window.addEventListener('ed:radio:whats:response', onRadioWhats);
    window.addEventListener('ed:owes:response', onOwes);
    window.addEventListener('ed:earnings:week:response', onEarningsWeek);
    window.addEventListener('ed:earnings:month:response', onEarningsMonth);
    window.addEventListener('ed:tomorrow:response', onTomorrow);
    window.addEventListener('ed:lastlesson:response', onLastLesson);
    window.addEventListener('ed:pupilcount:response', onPupilCount);
    window.addEventListener('ed:testdate:response', onTestDate);
    window.addEventListener('ed:hours:response', onHours);
    window.addEventListener('ed:reminder:response', onReminder);
    window.addEventListener('ed:busiestday:response', onBusiestDay);
    window.addEventListener('ed:cancellations:response', onCancellations);
    return () => {
      window.removeEventListener('ed:earnings:response', onEarnings);
      window.removeEventListener('ed:lessoncount:response', onLessonCount);
      window.removeEventListener('ed:enquiries:response', onEnquiries);
      window.removeEventListener('ed:radio:whats:response', onRadioWhats);
      window.removeEventListener('ed:owes:response', onOwes);
      window.removeEventListener('ed:earnings:week:response', onEarningsWeek);
      window.removeEventListener('ed:earnings:month:response', onEarningsMonth);
      window.removeEventListener('ed:tomorrow:response', onTomorrow);
      window.removeEventListener('ed:lastlesson:response', onLastLesson);
      window.removeEventListener('ed:pupilcount:response', onPupilCount);
      window.removeEventListener('ed:testdate:response', onTestDate);
      window.removeEventListener('ed:hours:response', onHours);
      window.removeEventListener('ed:reminder:response', onReminder);
      window.removeEventListener('ed:busiestday:response', onBusiestDay);
      window.removeEventListener('ed:cancellations:response', onCancellations);
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
    availableVoices,
    selectedVoiceName,
    setVoice,
    speak,
  };

}
