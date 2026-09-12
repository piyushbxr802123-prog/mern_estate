import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";

import Home from "./pages/Home";
import About from "./pages/About";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import CreateListing from "./pages/CreateListing";
import UpdateListing from "./pages/UpdateListing";
import Listing from './pages/Listing';
import PrivateRoute from "./components/PrivateRoute";
import Search from './pages/Search';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
          <Route path='/search' element={<Search />} />
        {/* public listing page */}
        <Route path="/listing/:listingId" element={<Listing />} />

        {/* protected */}
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/update-listing/:listingId" element={<UpdateListing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}