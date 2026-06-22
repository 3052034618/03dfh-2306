import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Calendar from '@/pages/Calendar'
import Rooms from '@/pages/Rooms'
import Staff from '@/pages/Staff'
import Consumables from '@/pages/Consumables'
import Review from '@/pages/Review'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/consumables" element={<Consumables />} />
          <Route path="/review" element={<Review />} />
        </Route>
      </Routes>
    </Router>
  )
}
