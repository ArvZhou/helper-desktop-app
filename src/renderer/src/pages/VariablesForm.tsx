import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React, { useCallback } from 'react';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import {
  Control,
  Controller,
  FieldError,
  FieldPath,
  useForm,
} from 'react-hook-form';
import FormControl from '@mui/material/FormControl';
import VisuallyHiddenInput from '../components/VisuallyHiddenInput';
import { getJSONFromFile } from '../utils/file.utils';
import Grid2 from '@mui/material/Unstable_Grid2/Grid2';
import { Variables, projectDefaultVariables } from '../contants';

type InputsType = {
  name: FieldPath<Variables>;
  error: FieldError | undefined;
  errText: string;
  label: string;
}

export default function VariablesForm() {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Variables>({ defaultValues: projectDefaultVariables });

  const onSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;

    if (files?.[0]) {
      const variables = (await getJSONFromFile(files[0])) as Variables;

      Object.entries(variables).forEach(([upperKey, value]) => {
        Object.entries(value).forEach(([key, value]) => {
          setValue(`${upperKey}.${key}`, value);
        })
      })
    }
  }, [setValue]);

  const sharingInputArrays:InputsType[]  = Object.keys(projectDefaultVariables.SHARE_PROJECT).map((key) => {
    return { name: `SHARE_PROJECT.${key}`, label: key, errText: `${key} can not be empty.`, error: errors.SHARE_PROJECT?.[key] }
  })

  const targetInputArrays:InputsType[] = Object.keys(projectDefaultVariables.TARGET_PROJECT).map((key) => {
    return { name: `TARGET_PROJECT.${key}`, label: key, errText: `${key} can not be empty.`, error: errors.TARGET_PROJECT?.[key] }
  })

  const onSubmit = useCallback( async (value: Variables) => {
    const isStart = await window.hygraphSyncApi.hygraphSync_start(value);

    if (isStart) {
      navigate('/log');
    }
  }, [navigate]);

  return (
    <Box p={2}>
      <Box justifyContent="space-between" display="flex">
        <Typography variant="h5" gutterBottom>
          Hygraph Sync Tool
        </Typography>
        <Box>
          <Button variant="text" component="label" size="small">
            <Typography variant="subtitle1" textTransform="none" fontSize={14}>
              Import Project Infomation
            </Typography>
            <VisuallyHiddenInput type="file" onChange={onSelect} />
          </Button>
          <Button variant="text" component="label" size="small">
            <Typography variant="body1" textTransform="none" fontSize={13}>
              Log
            </Typography>
          </Button>
        </Box>
      </Box>
      <Divider />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Sharing Project Info
        </Typography>
        <Paper sx={{ p: 2, mt: 1 }} elevation={1}>
          <Grid2 container spacing={2}>
            {
              sharingInputArrays.map(({name, label, errText, error }) => (
                <Grid2 key={name} xs={6}>
                  <CustomInputController name={name} control={control} label={label} errText={errText} error={error} />
                </Grid2>
              ))
            }
          </Grid2>
        </Paper>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Target Project Info
          </Typography>
        <Paper sx={{ p: 2, mt: 1 }} elevation={1}>
          <Grid2 container spacing={2}>
            {
              targetInputArrays.map(({name, label, errText, error }) => (
                <Grid2 key={name} xs={6}>
                  <CustomInputController name={name} control={control} label={label} errText={errText} error={error} />
                </Grid2>
              ))
            }
          </Grid2>
        </Paper>
        <Box alignItems='center' display="flex" justifyContent='center' marginTop={5}>
          <Button type="submit" variant='contained' sx={{ width: 240, fontSize: 13 }}>Start To Sync</Button>
        </Box>
      </form>
    </Box>
  );
}

function CustomInputController({ name, control, error, errText, label }: InputsType & {
  control: Control<Variables, any>;
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: true }}
      render={({ field }) => (
        <FormControl fullWidth>
          <TextField
            {...field}
            label={label}
            size="small"
            fullWidth
            error={!!error}
            helperText={error?.type === 'required' ? errText : ''}
          />
        </FormControl>
      )}
    />
  );
}
