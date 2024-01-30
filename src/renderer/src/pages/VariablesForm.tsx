import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React from 'react';
import Divider from '@mui/material/Divider';
import VisuallyHiddenInput from '../components/VisuallyHiddenInput';
import { getJSONFromFile } from '../utils/file.utils';

type Variables = {
  SHARE_PROJECT: Record<string, string>;
  TARGET_PROJECT: Record<string, string>;
};

export default function VariablesForm() {
  const [defaultVariables, setDefaultVariables] = React.useState<Variables>({
    SHARE_PROJECT: {},
    TARGET_PROJECT: {},
  });

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;

    if (files?.[0]) {
      setDefaultVariables((await getJSONFromFile(files[0])) as Variables);
    }
  };

  return (
    <>
      <Box justifyContent="space-between" display="flex">
        <Typography variant="h6" gutterBottom>
          Hygraph Sync Tool
        </Typography>
        <Box>
          <Button variant="text" component="label" size="small">
            <Typography variant="body2" textTransform="none">
              Import Project Infomation
            </Typography>
            <VisuallyHiddenInput type="file" onChange={onSelect} />
          </Button>
          <Button variant="text" component="label" size="small">
            <Typography variant="body2" textTransform="none">
              Log
            </Typography>
          </Button>
        </Box>
      </Box>
      <Divider />
      <Box>ssss</Box>
    </>
  );
}
