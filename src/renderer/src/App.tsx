import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import VariablesForm from './pages/VariablesForm';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VariablesForm />} />
      </Routes>
    </Router>
  );
}
