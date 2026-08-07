import { Outlet } from 'react-router'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Navbar from './components/NavBar.jsx'
const App = () => {
  return (
    <>
      <div className="">
        <Navbar />
        <Outlet />
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  )
}

export default App
