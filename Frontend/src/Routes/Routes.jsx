import React from 'react';
import {Routes, Route} from 'react-router-dom';
import SuperAdminDashboard from '../Components/SuperAdmin/SuperAdminDashboard';
import VolunteerDashboard from '../Components/Volunteer/VolunteerDashboard';
import AdminDashboard from '../Components/Admin/AdminDashboard';
import UserDashboard from '../Components/User/UserDashboard';
import NavigationRoutes from '../Components/General/NavigationRoutes';


const AppRoutes = () => {
  return (
    <Routes>
      <Route path='/' element={<NavigationRoutes />} />
      <Route path="/superAdminDashboard" element={<SuperAdminDashboard />} />
      <Route path="/adminDashboard" element={<AdminDashboard />} />
      <Route path="/volunteerDashboard" element={<VolunteerDashboard />} />
      <Route path="/userDashboard" element={<UserDashboard />} />
    </Routes>
  )
}

export default AppRoutes