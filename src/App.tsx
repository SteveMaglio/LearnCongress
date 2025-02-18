import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { BsBarChartLineFill } from "react-icons/bs";
import { ImSearch } from "react-icons/im";
import { MdSwipe } from "react-icons/md";
import Swipe from "./pages/Swipe";
import Stats from "./pages/Stats";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { supabase } from "../src/utils/supabase"; // Import Supabase instance
import { useAuth } from "./utils/authContext";

const Sidebar = ({ isOpen, toggleMenu, user }: { isOpen: boolean; toggleMenu: () => void; user: any }) => {
  return (
    <div className={`h-screen text-white p-4 transition-all duration-300 ${isOpen ? "w-64" : "w-16"} flex flex-col`}> 
      <button onClick={toggleMenu} className="p-2 mb-4 flex items-center">
        <FaBars className="text-white" />
      </button>
      {isOpen && (
        <ul>
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
          {/* Hide login/signup if user is logged in */}
          {!user && (
            <>
              <li className="mb-2">
                <Link to="/login" className="flex items-center p-2 bg-blue-500 hover:bg-blue-700 rounded">
                  Login
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/signup" className="flex items-center p-2 bg-green-500 hover:bg-green-700 rounded">
                  Sign Up
                </Link>
              </li>
            </>
          )}
          {/* Show logout button if user is logged in */}
          {user && (
            <li className="mb-2">
              <button onClick={async () => await supabase.auth.signOut()} className="w-full p-2 bg-red-500 hover:bg-red-700 rounded">
                Logout
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    };

    fetchUser();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar isOpen={menuOpen} toggleMenu={toggleMenu} user={user} />
        <div className={`p-4 transition-all duration-300 flex-1 ${menuOpen ? "ml-64" : "ml-16"}`}> 
          <Routes>
            <Route path="/swipe" element={<Swipe />} />
            <Route path="/guesswho" element={<Swipe />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<h1>404 - Page Not Found</h1>} />  {/* Catch-all for invalid routes */}
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
