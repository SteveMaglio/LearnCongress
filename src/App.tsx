import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FaUsers, FaBars,  } from "react-icons/fa";
import { BsBarChartLineFill } from "react-icons/bs";
import { ImSearch } from "react-icons/im";
import { MdSwipe } from "react-icons/md";
import AllMembers from './pages/AllMembers.tsx';
import axios from "axios";


const Sidebar = ({ isOpen, toggleMenu }: { isOpen: boolean; toggleMenu: () => void }) => {
  return (
    <div className={`h-screen text-white p-4 transition-all duration-300 ${isOpen ? "w-64" : "w-16"} flex flex-col`}> 
      <button onClick={toggleMenu} className="p-2 mb-4 flex items-center">
        <FaBars className="text-white" />
      </button>
      {isOpen && (
        <ul>
          <li className="mb-2">
            <Link to="/allmembers" className="flex items-center p-2 hover:bg-gray-700 rounded">
              <FaUsers className="mr-2" /> All Members
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/swipe" className="flex items-center p-2 hover:bg-gray-700 rounded">
              <MdSwipe className="mr-2" /> Swipe
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/guesswho" className="flex items-center p-2 hover:bg-gray-700 rounded">
              <ImSearch className="mr-2" /> Guess Who
            </Link>
          </li>
          <li className="mb-2">
            <Link to="/stats" className="flex items-center p-2 hover:bg-gray-700 rounded">
              <BsBarChartLineFill className="mr-2" /> Your Statistics
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
};

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar isOpen={menuOpen} toggleMenu={toggleMenu} />
        <div className={`p-4 transition-all duration-300 flex-1 ${menuOpen ? "ml-64" : "ml-16"}`}> 
          <Routes>
            <Route path="/allmembers" element={<AllMembers />} />
            <Route path="/swipe" element={<AllMembers />} />
            <Route path="/guesswho" element={<AllMembers />} />
            <Route path="/stats" element={<AllMembers />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
