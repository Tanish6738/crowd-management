import React from 'react'
import Routes from './Routes/Routes'
import Navbar from './Components/General/Navbar'

const App = () => {
  return (
    <div className="min-h-screen mk-gradient-bg bg-fixed text-[13px]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Routes />
      </div>
    </div>
  )
}

export default App