import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Ads from './pages/Ads';
import Subscriptions from './pages/Subscriptions';
import Content from './pages/Content';
import Notifications from './pages/Notifications';
import Users from './pages/Users';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/content" element={<Content />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
