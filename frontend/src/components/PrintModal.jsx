// src/components/PrintModal.jsx
import { useState } from 'react';
import { Modal, Box, Typography, Button, RadioGroup, FormControlLabel, Radio, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// 🌟 ייבוא הקבועים החדשים מהעמוד הייעודי
import { MODAL_TEXTS } from '../pages/HardCodePage';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function PrintModal({ open, onClose, selectedRows }) {
  const navigate = useNavigate();
  
  // 1. בדיקה בטוחה עבור השלב (Step)
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('fromPreview') === 'true' ? 2 : 1;
    }
    return 1;
  });

  // 2. בדיקה בטוחה עבור גודל המדבקה
  const [labelSize, setLabelSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('savedLabelSize') || 'medium';
    }
    return 'medium';
  });

  // 3. בדיקה בטוחה עבור המדפסת
  const [printer, setPrinter] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('savedPrinter') || 'printer1';
    }
    return 'printer1';
  });
  
  const [printType, setPrintType] = useState('labels');

  // פונקציה שמטפלת במעבר משלב 1 לשלב 2
  const handleNextStep = () => {
    if (printType === 'labels') {
      setStep(2);
    } else {
      // 🌟 שימוש בפונקציית הטקסט הדינמית מהקבועים
      alert(MODAL_TEXTS.NOT_AVAILABLE_ALERT(printType));
    }
  };

  const handlePrint = () => {
    alert(`שולח להדפסה במדפסת ${printer} בגודל ${labelSize} עבור ${selectedRows.length} רשומות.`);
    
    sessionStorage.removeItem('fromPreview');
    sessionStorage.removeItem('savedLabelSize');
    sessionStorage.removeItem('savedPrinter');
    
    onClose();
    setStep(1); 
  };

  const handlePreview = () => {
    navigate('/print-preview', { state: { selectedItems: selectedRows, labelSize, printer } });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        
        {/* --- שלב 1: על מה תרצה להדפיס? --- */}
        {step === 1 && (
          <Box>
            <Typography variant="h6" mb={2}>{MODAL_TEXTS.STEP_1_TITLE}</Typography>
            <RadioGroup value={printType} onChange={(e) => setPrintType(e.target.value)}>
              <FormControlLabel value="labels" control={<Radio />} label={MODAL_TEXTS.LABEL_OPTION} />
              <FormControlLabel value="envelopes" control={<Radio />} label={MODAL_TEXTS.ENVELOPES_OPTION} />
              <FormControlLabel value="lists" control={<Radio />} label={MODAL_TEXTS.LISTS_OPTION} />
            </RadioGroup>
            
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
              <Button onClick={onClose} color="inherit">{MODAL_TEXTS.BUTTON_CANCEL}</Button>
              <Button variant="contained" onClick={handleNextStep}>{MODAL_TEXTS.BUTTON_NEXT}</Button>
            </Stack>
          </Box>
        )}

        {/* --- שלב 2: הגדרות מדבקה ומדפסת --- */}
        {step === 2 && (
          <Box>
            <Typography variant="h6" mb={3}>{MODAL_TEXTS.STEP_2_TITLE}</Typography>
            
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel id="size-label">{MODAL_TEXTS.SIZE_INPUT_LABEL}</InputLabel>
                <Select
                  labelId="size-label"
                  value={labelSize}
                  label={MODAL_TEXTS.SIZE_INPUT_LABEL}
                  onChange={(e) => setLabelSize(e.target.value)}
                >
                  <MenuItem value="small">{MODAL_TEXTS.SIZE_SMALL}</MenuItem>
                  <MenuItem value="medium">{MODAL_TEXTS.SIZE_MEDIUM}</MenuItem>
                  <MenuItem value="large">{MODAL_TEXTS.SIZE_LARGE}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="printer-label">{MODAL_TEXTS.PRINTER_INPUT_LABEL}</InputLabel>
                <Select
                  labelId="printer-label"
                  value={printer}
                  label={MODAL_TEXTS.PRINTER_INPUT_LABEL}
                  onChange={(e) => setPrinter(e.target.value)}
                >
                  <MenuItem value="printer1">{MODAL_TEXTS.PRINTER_MAIN}</MenuItem>
                  <MenuItem value="printer2">{MODAL_TEXTS.PRINTER_BACK}</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="space-between" mt={4}>
              <Button onClick={() => setStep(1)} color="inherit">{MODAL_TEXTS.BUTTON_BACK}</Button>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handlePreview}>{MODAL_TEXTS.BUTTON_PREVIEW}</Button>
                <Button variant="contained" onClick={handlePrint} color="success">{MODAL_TEXTS.BUTTON_PRINT}</Button>
              </Stack>
            </Stack>
          </Box>
        )}

      </Box>
    </Modal>
  );
}