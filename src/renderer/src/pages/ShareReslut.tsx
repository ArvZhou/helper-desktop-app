import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ReplyIcon from '@mui/icons-material/Reply';
import { SyncListItem } from '../../../main/hygraph/hygraph.utils';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import { LogIcon } from '../components/icons';

export default function Log() {
  const {
    state: { syncList },
  } = useLocation();
  const navigate = useNavigate();
  const list = JSON.parse(syncList) as SyncListItem[];

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      <Box justifyContent="space-between" display="flex" p={2}>
        <Typography variant="h5" gutterBottom>
          Log Reslut Page
        </Typography>
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => window.hygraphSyncApi.hygraphSync_openLog()}
          >
            <LogIcon />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate('/')}
          >
            <ReplyIcon />
          </IconButton>
        </Box>
      </Box>
      <Divider />
      <Box flex={1} overflow={"auto"}>
        <Table stickyHeader size="small" aria-label="domains config table">
          <TableHead>
            <TableRow>
              <TableCell width="20%">Action</TableCell>
              <TableCell width="70%">Name</TableCell>
              <TableCell width="10%">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(({ operationName, data }) => (
              <TableRow key={operationName}>
                <TableCell>{operationName}</TableCell>
                <TableCell>{data.displayName}</TableCell>
                <TableCell>Success</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
