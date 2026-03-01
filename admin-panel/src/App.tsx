import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Ads from './pages/Ads';
import Subscriptions from './pages/Subscriptions';
import Content from './pages/Content';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import Pricing from './pages/Pricing';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/ads" element={<Layout><Ads /></Layout>} />
        <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
        <Route path="/subscriptions" element={<Layout><Subscriptions /></Layout>} />
        <Route path="/content" element={<Layout><Content /></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
        <Route path="/users" element={<Layout><Users /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
