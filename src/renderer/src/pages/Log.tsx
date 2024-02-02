import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css'
import styles from './log.module.css'

export default function Log() {
  const xtermRef = useRef<HTMLDivElement>(null);

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
    term.writeln('Start to sync project...\n');
    for (let i = 0; i < 300; i++) {
      term.write(`Hello from \x1B[1;3;31mxterm.js\x1B[0m $ `);
    }
  },[])

  return (
    <div ref={xtermRef} className={styles.xtermContainer}></div>
  );
}
