import React from 'react'
import { Outlet } from 'react-router'
import Navbar from './components/NavBar.jsx'
const App = () => {
  return (
    <>
      <div className="">
        <Navbar />
        <Outlet /> 
      </div>
    </>
  )
}

export default App
