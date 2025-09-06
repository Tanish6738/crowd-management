import React from 'react';
import {Routes, Route} from 'react-router-dom';
import SuperAdminDashboard from '../Components/SuperAdmin/SuperAdminDashboard';
import VolunteerDashboard from '../Components/Volunteer/VolunteerDashboard';
import AdminDashboard from '../Components/Admin/AdminDashboard';
import UserDashboard from '../Components/User/UserDashboard';
import NavigationRoutes from '../Components/General/NavigationRoutes';
import ProtectedRoute from './ProtectedRoute';
import SignInPage from '../Components/Auth/SignInPage';
import SignUpPage from '../Components/Auth/SignUpPage';


const AppRoutes = () => {
  return (
    <Routes>
      <Route path='/' element={<NavigationRoutes />} />
      <Route path='/sign-in' element={<SignInPage />} />
      <Route path='/sign-up' element={<SignUpPage />} />
      <Route path="/superAdminDashboard" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/adminDashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/volunteerDashboard" element={<ProtectedRoute><VolunteerDashboard /></ProtectedRoute>} />
      {/* <Route path="/userDashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} /> */}
    </Routes>
  )
}

export default AppRoutes