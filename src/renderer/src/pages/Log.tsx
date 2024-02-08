import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css'
import styles from './log.module.css'

export default function Log() {
  const xtermRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null)

  useEffect(() => {
    const term = new Terminal({
      fontSize: 14,
      cols: 94,
      rows: 32,
      disableStdin: false,
      letterSpacing: 1.5,
      lineHeight: 1,
      theme: {
        foreground: '#000',
        background: '#fff',
        cursor: '#999',
        cursorAccent: '#999',
        selectionBackground: 'rgba(0, 0, 0, 0.3)',
        selectionForeground: '#000',
      },
      windowsMode: true,
      windowOptions: {
        fullscreenWin: true
      }
    });
    term.open(xtermRef.current as HTMLDivElement);
    setTerm(term);
  },[])

  useEffect(() => {
    if (!term) return;
    window.hygraphSyncApi.onHygraphSync(({msg, type}) => {
      console.log(msg, type);
      if (type === 'info' || !type) {
        term.writeln(`\x1b[34m${msg}\x1b[0m`);
      }

      if (type === 'error') {
        term.writeln(`\x1b[31m${msg}\x1b[0m`);
      }

      if (type === 'warn') {
        term.writeln(`\x1b[3m${msg}\x1b[0m`);
      }
    });
  }, [term])

  return (
    <div ref={xtermRef} className={styles.xtermContainer}></div>
  );
}
