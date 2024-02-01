import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import VariablesForm from './pages/VariablesForm';
import Log from './pages/Log';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/log" element={<VariablesForm />} />
        <Route path="/" element={<Log />} />
      </Routes>
    </Router>
  );
}
