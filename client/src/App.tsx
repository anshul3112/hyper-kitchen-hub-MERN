import {BrowserRouter,Routes,Route} from 'react-router-dom'
import './App.css'
import ErrorPage from "./common/pages/ErrorPage"
import LoginPage from "./features/auth/pages/LoginPage"
import SuperAdminPage from "./features/superAdmin/pages/SuperAdminPage"
import TenantAdminPage from "./features/tenant/pages/TenantAdminPage"
import OutletAdminPage from "./features/outlet/pages/OutletAdminPage"

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/superAdmin" element={<SuperAdminPage />} />
        <Route path="/tenantAdmin" element={<TenantAdminPage />} />
        <Route path="/outletAdmin" element={<OutletAdminPage />} />
        <Route path="/*" element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App