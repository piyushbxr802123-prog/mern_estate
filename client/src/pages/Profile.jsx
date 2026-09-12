// Profile.jsx (Cloudinary + MERN backend)
// - Upload avatar to Cloudinary (unsigned preset)
// - Update user via: POST /api/user/update/:id  (cookie JWT auth)
// - Show user listings via: GET /api/user/listings/:id

import { useSelector, useDispatch } from "react-redux";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOutUserStart,
  signOutUserSuccess,
  signOutUserFailure,
} from "../redux/user/userSlice";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "o3fv4sn7";
const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "profile_unsigned";

export default function Profile() {
  const fileRef = useRef(null);
  const dispatch = useDispatch();
  const { currentUser, loading, error } = useSelector((state) => state.user);

  const [file, setFile] = useState(null);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    avatar: "",
  });

  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [showListingsError, setShowListingsError] = useState(false);
  const [userListings, setUserListings] = useState([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  // Keep form in sync with redux user (important after refresh / update)
  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      username: currentUser.username || "",
      email: currentUser.email || "",
      password: "",
      avatar: currentUser.avatar || "",
    });
  }, [currentUser]);

  // Upload when a new file is selected
  useEffect(() => {
    if (file) handleFileUpload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleFileUpload = (file) => {
    setFileUploadError("");
    setUpdateSuccess(false);

    if (file.size > 2 * 1024 * 1024) {
      setFileUploadError("Image must be less than 2MB");
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      setFilePerc(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
          setFormData((prev) => ({ ...prev, avatar: res.secure_url }));
          setFilePerc(100);
        } else {
          setFileUploadError(res?.error?.message || "Upload failed");
        }
      } catch {
        setFileUploadError("Upload failed");
      }
    };

    xhr.onerror = () => setFileUploadError("Network error while uploading");

    setFilePerc(0);
    xhr.send(data);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateSuccess(false);

    try {
      dispatch(updateUserStart());

      const payload = {
        username: formData.username,
        email: formData.email,
        avatar: formData.avatar,
        ...(formData.password ? { password: formData.password } : {}),
      };

      const res = await fetch(`/api/user/update/${currentUser._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        dispatch(updateUserFailure(data?.message || "Update failed"));
        return;
      }

      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      dispatch(updateUserFailure(err.message));
    }
  };

  const handleDeleteUser = async () => {
    try {
      dispatch(deleteUserStart());

      const res = await fetch(`/api/user/delete/${currentUser._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        dispatch(deleteUserFailure(data?.message || "Delete failed"));
        return;
      }

      dispatch(deleteUserSuccess());
    } catch (err) {
      dispatch(deleteUserFailure(err.message));
    }
  };

  const handleSignOut = async () => {
    try {
      dispatch(signOutUserStart());

      const res = await fetch("/api/auth/signout", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        dispatch(signOutUserFailure(data?.message || "Sign out failed"));
        return;
      }

      dispatch(signOutUserSuccess());
    } catch (err) {
      dispatch(signOutUserFailure(err.message));
    }
  };

  const handleShowListings = async () => {
    try {
      setShowListingsError(false);
      setListingsLoaded(false);

      const res = await fetch(`/api/user/listings/${currentUser._id}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        setShowListingsError(true);
        return;
      }

      // support both shapes: [..] OR { listings: [..] }
      const listings = Array.isArray(data) ? data : data.listings;

      setUserListings(listings || []);
      setListingsLoaded(true);
    } catch (err) {
      setShowListingsError(true);
    }
  };

 const handleListingDelete = async (listingId) => {
    try {
      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success === false) {
        console.log(data.message);
        return;
      }

      setUserListings((prev) =>
        prev.filter((listing) => listing._id !== listingId)
      );
    } catch (error) {
      console.log(error.message);
    }
  };

  if (!currentUser) {
    return <div className="p-3 max-w-lg mx-auto">Please sign in.</div>;
  }

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Profile</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          type="file"
          ref={fileRef}
          hidden
          accept="image/*"
        />

        <img
          onClick={() => fileRef.current?.click()}
          src={formData.avatar || currentUser.avatar}
          alt="profile"
          className="rounded-full h-24 w-24 object-cover cursor-pointer self-center mt-2"
        />

        <p className="text-sm self-center">
          {fileUploadError ? (
            <span className="text-red-700">{fileUploadError}</span>
          ) : filePerc > 0 && filePerc < 100 ? (
            <span className="text-slate-700">{`Uploading ${filePerc}%`}</span>
          ) : filePerc === 100 ? (
            <span className="text-green-700">Image successfully uploaded!</span>
          ) : (
            ""
          )}
        </p>

        <input
          type="text"
          placeholder="username"
          id="username"
          className="border p-3 rounded-lg"
          value={formData.username}
          onChange={handleChange}
        />

        <input
          type="email"
          placeholder="email"
          id="email"
          className="border p-3 rounded-lg"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          placeholder="password"
          id="password"
          autoComplete="current-password"
          className="border p-3 rounded-lg"
          value={formData.password}
          onChange={handleChange}
        />

        <button
          disabled={loading || (filePerc > 0 && filePerc < 100)}
          className="bg-slate-700 text-white rounded-lg p-3 uppercase hover:opacity-95 disabled:opacity-80"
        >
          {loading ? "Loading..." : "Update"}
        </button>

        <Link
          className="bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95"
          to="/create-listing"
        >
          Create Listing
        </Link>
      </form>

      <div className="flex justify-between mt-5">
        <span onClick={handleDeleteUser} className="text-red-700 cursor-pointer">
          Delete account
        </span>
        <span onClick={handleSignOut} className="text-red-700 cursor-pointer">
          Sign out
        </span>
      </div>

      {error ? <p className="text-red-700 mt-5">{error}</p> : null}
      {updateSuccess ? (
        <p className="text-green-700 mt-5">User updated successfully!</p>
      ) : null}

      <button
        type="button"
        onClick={handleShowListings}
        className="text-green-700 w-full mt-5"
      >
        Show Listings
      </button>

      {showListingsError ? (
        <p className="text-red-700 mt-3">Error showing listings</p>
      ) : null}

      {listingsLoaded && userListings.length === 0 && !showListingsError ? (
        <p className="text-slate-600 text-center mt-3">No listings found.</p>
      ) : null}

     {userListings && userListings.length > 0 && (
        <div className='flex flex-col gap-4'>
          <h1 className='text-center mt-7 text-2xl font-semibold'>
            Your Listings
          </h1>
     
          {userListings.map((listing) => (
            <div
              key={listing._id}
              className="border rounded-lg p-3 flex justify-between items-center gap-4"
            >
              <Link to={`/listing/${listing._id}`}>
                <img
                  src={listing.imageUrls?.[0]}
                  alt="listing cover"
                  className="h-16 w-16 object-contain"
                />
              </Link>

              <Link
                className="text-slate-700 font-semibold hover:underline truncate flex-1"
                to={`/listing/${listing._id}`}
              >
                <p>{listing.name}</p>
              </Link>

              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleListingDelete(listing._id)}
                  className="text-red-700 uppercase"
                >
                  Delete
                </button>

                 <Link to={`/update-listing/${listing._id}`}>
                  <button className='text-green-700 uppercase'>Edit</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}