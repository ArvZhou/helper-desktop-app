import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import dayjs from 'dayjs';
import 'xterm/css/xterm.css';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { LogIcon } from '../components/icons';
import ReplyIcon from '@mui/icons-material/Reply';

const logConfig = {
  fontSize: 12,
  disableStdin: false,
  letterSpacing: 1.2,
  lineHeight: 1.1,
};

export default function Log() {
  const navigate = useNavigate();
  const xtermRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [end, setEnd] = useState(false);

  useEffect(() => {
    const term = new Terminal(logConfig);
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(xtermRef.current as HTMLDivElement);
    fitAddon.fit();
    setTerm(term);
    setFitAddon(fitAddon);
  }, []);

  useEffect(() => {
    if (!fitAddon) return;
    const fit = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', fit);

    return () => {
      window.removeEventListener('resize', fit);
    };
  }, [fitAddon]);

  useEffect(() => {
    if (!term) return;

    window.hygraphSyncApi.onHygraphSync(({ msg, type = 'info' }) => {
      const time = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const colors = { info: '37', error: '31', warn: '33', success: '32' };

      term.writeln(
        `\x1b[${colors[type as keyof typeof colors]}m ${time} [${type}] ${msg}\x1b[0m`,
      );
    });

    window.hygraphSyncApi.hygraphSyncSuccess((syncList: string) => {
      console.log('syncList', syncList);
      if (syncList !== 'error') {
        navigate('/share-result', { state: { syncList } });
      }

      setEnd(true);
    });
  }, [term]);

  return (
    <Box p={2}>
      <Box justifyContent="space-between" display="flex">
        <Typography variant="h5" gutterBottom>
          Log Details Page
        </Typography>
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => window.hygraphSyncApi.hygraphSync_openLog()}
          >
            <LogIcon />
          </IconButton>
          {end && (
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate('/')}
            >
              <ReplyIcon />
            </IconButton>
          )}
        </Box>
      </Box>
      <Divider />
      <div ref={xtermRef} style={{ height: 'calc(100vh - 70px)' }}></div>
    </Box>
  );
}
