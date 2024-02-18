import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import VariablesForm from './pages/VariablesForm';
import ShareReslut from './pages/ShareReslut'
import Log from './pages/Log';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VariablesForm />} />
        <Route path="/log" element={<Log />} />
        <Route path="/share-result" element={<ShareReslut />} />
      </Routes>
    </Router>
  );
}
