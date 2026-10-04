import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './styles.css';

const LETTER = (name) => [
  `Dear ${name},`,

  `A teacher's influence is not measured only by the lessons written on a board. Sometimes, it is found in a few words spoken at exactly the right moment — words that make a student try again.`,

  `Thank you for keeping me on the right path, for motivating me when things became difficult, and for believing in me — even when I was not completely sure of myself.`,

  `Your guidance has become part of my journey, and I will always be grateful for it. I hope that, as I continue toward my goals, I can make you proud.`,

  `Please keep me in your prayers as I work toward becoming the person I hope to be.`,

  `آپ کی دعائیں میرے لیے بہت قیمتی ہیں۔`,

  `May I continue to learn, grow, and become worthy of the faith you placed in me.`
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeFileName = (name) =>
  (name || 'Teacher')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 45) || 'Teacher';


function useTypewriter(lines, active) {
  const [shown, setShown] = useState([]);

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      setShown([]);
      return;
    }

    (async () => {
      const out = [];

      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;

        let text = '';

        const speed = i === 0 ? 55 : 20;

        for (const char of lines[i]) {
          if (cancelled) return;

          text += char;

          setShown([...out, text]);

          await wait(
            char === ' '
              ? speed / 2
              : speed
          );
        }

        out.push(text);

        setShown([...out]);

        await wait(
          i === 5
            ? 700
            : 420
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, lines]);

  return shown;
}


function App() {

  const [name, setName] = useState(
    () => localStorage.getItem('teacherDayName') || ''
  );

  const [screen, setScreen] = useState('welcome');

  const [musicOn, setMusicOn] = useState(false);

  const [notice, setNotice] = useState('');

  const [surprise, setSurprise] = useState(false);

  const [writing, setWriting] = useState(false);

  const audioCtx = useRef(null);

  const musicNodes = useRef([]);

  const musicEnabled = useRef(false);

  const downloadRef = useRef(null);

  const safeName = useMemo(
    () =>
      name
        .trim()
        .replace(/\s+/g, ' '),
    [name]
  );

  const lines = useMemo(
    () => LETTER(safeName || 'Teacher'),
    [safeName]
  );

  const typed = useTypewriter(
    lines,
    writing
  );


  useEffect(() => {

    document.title = safeName
      ? `For ${safeName} — A Teacher's Impact`
      : "A Teacher's Impact — Ahmed";

  }, [safeName]);


  useEffect(() => {

    if (screen === 'letter') {

      setWriting(false);

      const timer = setTimeout(
        () => setWriting(true),
        500
      );

      return () => clearTimeout(timer);
    }

  }, [screen]);


  const start = () => {

    const clean = name
      .trim()
      .replace(/\s+/g, ' ');

    if (!clean) {

      setNotice(
        'Please enter your name so I can prepare your personal message.'
      );

      return;
    }

    if (clean.length > 80) {

      setNotice(
        'Please keep the name under 80 characters.'
      );

      return;
    }

    setName(clean);

    localStorage.setItem(
      'teacherDayName',
      clean
    );

    setNotice('');

    setScreen('intro');
  };


  const startMusic = async () => {

    try {

      const Ctx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!Ctx) {
        throw new Error('Audio unavailable');
      }

      if (!audioCtx.current) {
        audioCtx.current =
          new Ctx();
      }

      const ctx = audioCtx.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (musicNodes.current.length) {
        return;
      }

      const master =
        ctx.createGain();

      master.gain.value = 0.035;

      master.connect(
        ctx.destination
      );

      const notes = [
        261.63,
        329.63,
        392,
        493.88,
        392,
        329.63
      ];

      let index = 0;

      const playNote = () => {

        if (!musicEnabled.current) {
          return;
        }

        const osc =
          ctx.createOscillator();

        const gain =
          ctx.createGain();

        osc.type = 'sine';

        osc.frequency.value =
          notes[
            index++ %
            notes.length
          ];

        gain.gain.setValueAtTime(
          0,
          ctx.currentTime
        );

        gain.gain.linearRampToValueAtTime(
          0.45,
          ctx.currentTime + 0.08
        );

        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 2.6
        );

        osc
          .connect(gain)
          .connect(master);

        osc.start();

        osc.stop(
          ctx.currentTime + 2.7
        );
      };

      playNote();

      const timer =
        setInterval(
          playNote,
          1300
        );

      musicNodes.current = [
        master,
        timer
      ];

    } catch {

      setNotice(
        'Your browser does not allow background music here, but the experience still works perfectly.'
      );

    }
  };


  const toggleMusic = async () => {

    if (musicOn) {

      musicEnabled.current =
        false;

      setMusicOn(false);

      const [
        master,
        timer
      ] = musicNodes.current;

      if (timer) {
        clearInterval(timer);
      }

      if (master) {
        master.disconnect();
      }

      musicNodes.current = [];

      return;
    }

    musicEnabled.current =
      true;

    setMusicOn(true);

    await startMusic();
  };


  const openEnvelope = () => {
    setScreen('letter');
  };


  const replay = () => {

    musicEnabled.current =
      false;

    const [
      master,
      timer
    ] = musicNodes.current;

    if (timer) {
      clearInterval(timer);
    }

    if (master) {
      master.disconnect();
    }

    musicNodes.current = [];

    setSurprise(false);

    setNotice('');

    setMusicOn(false);

    setScreen('welcome');
  };


  const renderExport = async () => {

    if (!downloadRef.current) {
      throw new Error(
        'Export card unavailable'
      );
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    return html2canvas(
      downloadRef.current,
      {
        scale: Math.min(
          3,
          Math.max(
            2,
            window.devicePixelRatio || 2
          )
        ),

        backgroundColor:
          '#f7f0e3',

        useCORS: true,

        allowTaint: false,

        logging: false,

        width: 1000,

        height: 1414,

        windowWidth: 1000,

        windowHeight: 1414
      }
    );
  };


  const downloadPNG = async () => {

    setNotice(
      'Writing your personalized PNG…'
    );

    try {

      const canvas =
        await renderExport();

      const link =
        document.createElement('a');

      link.download =
        `Teachers-Day-2026-${safeFileName(
          safeName
        )}.png`;

      link.href =
        canvas.toDataURL(
          'image/png',
          1
        );

      link.click();

      setNotice(
        'Your PNG is ready.'
      );

    } catch (error) {

      console.error(error);

      setNotice(
        'PNG export failed in this browser. Try the PDF button or save the letter as an image from your browser.'
      );
    }
  };


  const downloadPDF = async () => {

    setNotice(
      'Preparing your personalized PDF…'
    );

    try {

      const canvas =
        await renderExport();

      const pdf =
        new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

      const pageWidth = 210;

      const pageHeight = 297;

      pdf.addImage(
        canvas.toDataURL(
          'image/jpeg',
          0.96
        ),
        'JPEG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );

      pdf.save(
        `Teachers-Day-2026-${safeFileName(
          safeName
        )}.pdf`
      );

      setNotice(
        'Your PDF is ready.'
      );

    } catch (error) {

      console.error(error);

      setNotice(
        'PDF export failed in this browser. Try the PNG button instead.'
      );
    }
  };


  const share = async () => {

    const url =
      window.location.href;

    const text =
      `Ahmed made a special Teacher's Day 2026 message for you. Open this and enter your name: ${url}`;

    try {

      if (navigator.share) {

        await navigator.share({
          title:
            "A Teacher's Impact — Ahmed",

          text,

          url
        });

        setNotice(
          'Share sheet opened.'
        );

      } else if (
        navigator.clipboard?.writeText
      ) {

        await navigator.clipboard.writeText(
          text
        );

        setNotice(
          'Share message copied. Paste it into WhatsApp or any chat.'
        );

      } else {

        setNotice(
          'Sharing is unavailable on this browser. Copy the page address from your browser.'
        );
      }

    } catch (error) {

      if (
        error?.name !==
        'AbortError'
      ) {

        setNotice(
          'Sharing was unavailable. Your downloads are still available.'
        );
      }
    }
  };


  return (

    <main className="app">

      <div className="grain" />

      <div
        className="stars"
        aria-hidden="true"
      >
        {Array.from(
          { length: 28 },
          (_, i) => (
            <i
              key={i}
              style={{
                '--i': i
              }}
            />
          )
        )}
      </div>


      <button
        className="music"
        onClick={toggleMusic}
        aria-label={
          musicOn
            ? 'Mute music'
            : 'Play music'
        }
      >
        {
          musicOn
            ? '♫ MUSIC ON'
            : '♫ MUSIC OFF'
        }
      </button>


      {screen === 'welcome' && (

        <section
          className="screen welcome"
        >

          <div className="orb orb-a" />

          <div className="orb orb-b" />


          <p className="eyebrow reveal d1">
            TEACHER'S DAY · 2026
          </p>


          <h1 className="reveal d2">

            For the people
            <br />

            <em>
              who don't just teach,
            </em>

            <br />

            but shape who we become.

          </h1>


          <p className="lead reveal d3">
            A small message of gratitude
            from Ahmed.
          </p>


          <div className="name-card reveal d4">

            <label htmlFor="teacher-name">
              Enter your name or title
            </label>


            <input
              id="teacher-name"
              value={name}
              onChange={(e) => {
                setName(
                  e.target.value
                );

                setNotice('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  start();
                }
              }}
              placeholder="Mr. Ahmed, Mrs. Sara, Sir…"
              maxLength={80}
              autoComplete="name"
            />


            <button
              className="primary"
              onClick={start}
            >
              Prepare my message
              <span>→</span>
            </button>


            {notice && (

              <p
                className="notice"
                role="status"
              >
                {notice}
              </p>

            )}

          </div>


          <p className="tiny reveal d5">
            Designed with gratitude · Pakistan · 2026
          </p>

        </section>

      )}


      {screen === 'intro' && (

        <section className="screen intro">

          <p className="eyebrow">
            A MESSAGE ESPECIALLY FOR YOU
          </p>


          <h2>
            Dear
            <br />
            <span>{safeName}</span>
          </h2>


          <p className="lead">
            Some words are easier to write
            than to say.
          </p>


          <button
            className="envelope-wrap"
            onClick={openEnvelope}
            aria-label="Open your letter"
          >

            <div className="envelope">

              <div className="flap" />

              <div className="paper">
                With gratitude
                <br />
                <b>Ahmed</b>
              </div>

              <div className="seal">
                A
              </div>

            </div>

          </button>


          <p className="hint">
            Tap the letter to open it
          </p>

        </section>

      )}


      {screen === 'letter' && (

        <section
          className="screen letter-screen"
        >

          <article
            className="letter writing-letter"
          >

            <div className="letter-top">
              <span>
                TEACHER'S DAY
              </span>

              <span>
                2026
              </span>
            </div>


            <div className="letter-rule" />


            <p className="letter-kicker">
              A personal note of gratitude
            </p>


            <div
              className="handwriting"
              aria-live="polite"
            >

              {typed.map(
                (line, i) => (

                  <p
                    key={i}
                    className={
                      i === 5
                        ? 'urdu'
                        : ''
                    }
                  >

                    {line}

                    {i === typed.length - 1 &&
                      writing && (
                        <span className="cursor" />
                      )}

                  </p>

                )
              )}

            </div>


            {typed.length >= lines.length && (

              <div className="signature">

                <span>
                  With gratitude,
                </span>

                <strong>
                  Ahmed
                </strong>

              </div>

            )}

          </article>


          <button
            className="continue"
            onClick={() =>
              setScreen('wall')
            }
          >
            Continue
            <span>↓</span>
          </button>


          {notice && (

            <p
              className="notice bottom"
              role="status"
            >
              {notice}
            </p>

          )}

        </section>

      )}


      {screen === 'wall' && (

        <section className="screen wall">

          <p className="eyebrow">
            THE TEACHER'S WALL
          </p>


          <h2>
            A teacher's impact
            <br />

            <em>
              never ends in the classroom.
            </em>
          </h2>


          <div className="impact-grid">

            {[
              'You taught me.',
              'You encouraged me.',
              'You believed in me.',
              'You helped shape my future.'
            ].map(
              (x, i) => (

                <div
                  className="impact"
                  key={x}
                  style={{
                    '--i': i
                  }}
                >

                  <span>
                    0{i + 1}
                  </span>

                  <b>
                    {x}
                  </b>

                </div>

              )
            )}

          </div>


          <blockquote>

            “A lesson may take an hour
            to teach.

            <br />

            <em>
              Its impact can last a lifetime.
            </em>

            ”

          </blockquote>


          <p className="urdu wall-urdu">
            استاد صرف سبق نہیں دیتے،
            راستہ بھی دکھاتے ہیں۔
          </p>


          <button
            className="primary"
            onClick={() =>
              setScreen('final')
            }
          >
            One last thing
            <span>→</span>
          </button>

        </section>

      )}


      {screen === 'final' && (

        <section className="screen final">

          <div className="final-glow" />


          <p className="eyebrow">
            FOR {safeName.toUpperCase()}
          </p>


          <h2>

            Happy Teacher's Day
            <br />

            <em>
              2026
            </em>

          </h2>


          <p className="final-copy">
            Thank you for being part of my
            journey. Your guidance,
            kindness and belief in me mean
            more than I can put into words.
          </p>


          <div
            className="surprise-zone"
            onClick={() =>
              setSurprise(true)
            }
            title="There may be something here…"
          >
            ✦
          </div>


          {surprise && (

            <div className="surprise">

              <p>
                You found Ahmed's little secret.
              </p>

              <strong>
                Thank you for believing in me.
              </strong>

              <span>
                And please… keep me in your prayers.
              </span>

            </div>

          )}


          <div className="signature big">

            <span>
              With gratitude,
            </span>

            <strong>
              Ahmed
            </strong>

          </div>


          <div className="actions">

            <button onClick={replay}>
              ↻ Replay
            </button>

            <button onClick={downloadPNG}>
              ↓ PNG
            </button>

            <button onClick={downloadPDF}>
              ↓ PDF
            </button>

            <button onClick={share}>
              ↗ Share
            </button>

          </div>


          {notice && (

            <p
              className="notice"
              role="status"
            >
              {notice}
            </p>

          )}


          <p className="tiny">
            Made with gratitude · Pakistan · 2026
          </p>

        </section>

      )}


      <div
        className="export-stage"
        aria-hidden="true"
      >

        <article
          className="export-card"
          ref={downloadRef}
        >

          <div className="export-inner">

            <div className="export-top">

              <span>
                TEACHER'S DAY
              </span>

              <span>
                2026
              </span>

            </div>


            <div className="export-line" />


            <div className="export-kicker">
              A personal note of gratitude
            </div>


            <h2>
              Dear {safeName || 'Teacher'},
            </h2>


            {lines.slice(1).map(
              (line, i) => (

                <p
                  key={i}
                  className={
                    i === 4
                      ? 'urdu'
                      : ''
                  }
                >
                  {line}
                </p>

              )
            )}


            <div className="export-sign">

              <span>
                With gratitude,
              </span>

              <strong>
                Ahmed
              </strong>

            </div>


            <div className="export-footer">
              A Teacher's Impact · Pakistan · 2026
            </div>

          </div>

        </article>

      </div>

    </main>
  );
}


createRoot(
  document.getElementById('root')
).render(
  <App />
);