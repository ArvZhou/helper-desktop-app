import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

export default function Log() {
  return (
    <Box p={2}>
      <Table stickyHeader size="small" aria-label="domains config table">
        <TableHead>
          <TableRow>
            <TableCell width="20%">Action</TableCell>
            <TableCell width="30%">Name</TableCell>
            <TableCell width="30%">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Create Model</TableCell>
            <TableCell>Test Model 1</TableCell>
            <TableCell>Successfully</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Create Simple Field</TableCell>
            <TableCell>Article</TableCell>
            <TableCell>Successfully</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Create Component</TableCell>
            <TableCell>Header</TableCell>
            <TableCell>Successfully</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
