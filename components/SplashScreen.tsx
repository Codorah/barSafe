import React, { useEffect, useState } from 'react';

/** Branded intro animation shown once when the app opens. */
const SplashScreen: React.FC = () => {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setHide(true), 1500);
    const t2 = window.setTimeout(() => setGone(true), 1950);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash ${hide ? 'splash-out' : ''}`} aria-hidden="true">
      <div className="splash-mark"><i className="fa-solid fa-martini-glass-citrus"></i></div>
      <div className="splash-word">Bar<span>Safe</span></div>
      <div className="splash-bar"><span></span></div>
    </div>
  );
};

export default SplashScreen;
