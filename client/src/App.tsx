import {BrowserRouter,Routes,Route} from 'react-router-dom'
import './App.css'
import ErrorPage from "./common/pages/ErrorPage"
import LoginPage from "./features/auth/pages/LoginPage"
import SuperAdminPage from "./features/superAdmin/pages/SuperAdminPage"
import TenantAdminPage from "./features/tenant/pages/TenantAdminPage"
import OutletAdminPage from "./features/outlet/pages/OutletAdminPage"
import KioskLoginPage from "./features/kiosk/pages/KioskLoginPage"
import KioskScreenPage from "./features/kiosk/pages/KioskPage"
import KitchenPage from "./features/kitchen/pages/KitchenPage"

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/superAdmin" element={<SuperAdminPage />} />
        <Route path="/tenantAdmin" element={<TenantAdminPage />} />
        <Route path="/outletAdmin" element={<OutletAdminPage />} />
        <Route path="/kiosk/login" element={<KioskLoginPage />} />
        <Route path="/kiosk/dashboard" element={<KioskScreenPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/*" element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App