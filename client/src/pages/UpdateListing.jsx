import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function UpdateListing() {
  const navigate = useNavigate();
  const { listingId } = useParams();

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    imageUrls: [],
    name: "",
    description: "",
    address: "",
    type: "rent", // "sell" or "rent"
    bedrooms: 1,
    bathrooms: 1,
    regularPrice: 50,
    discountPrice: 0,
    offer: false,
    parking: false,
    furnished: false,
  });

  // Load existing listing
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listing/get/${listingId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load listing");
        setFormData({
          ...data,
          // ensure defaults if missing
          imageUrls: data.imageUrls || [],
          offer: !!data.offer,
          parking: !!data.parking,
          furnished: !!data.furnished,
          discountPrice: data.discountPrice ?? 0,
        });
      } catch (e) {
        setError(e.message);
      }
    };

    fetchListing();
  }, [listingId]);

  // Upload ONE file to Cloudinary (returns secure_url)
  const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
            resolve(res.secure_url);
          } else {
            reject(new Error(res?.error?.message || "Cloudinary upload failed"));
          }
        } catch {
          reject(new Error("Cloudinary upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error while uploading"));
      xhr.send(data);
    });
  };

  const handleImageSubmit = async () => {
    setImageUploadError("");

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setImageUploadError("Cloudinary config missing (cloud name / upload preset).");
      return;
    }

    if (!files || files.length === 0) {
      setImageUploadError("Please choose at least one image.");
      return;
    }

    if (files.length + formData.imageUrls.length > MAX_IMAGES) {
      setImageUploadError(`You can upload max ${MAX_IMAGES} images.`);
      return;
    }

    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        setImageUploadError("Each image must be less than 2MB.");
        return;
      }
    }

    try {
      setUploading(true);
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));

      setFormData((prev) => ({
        ...prev,
        imageUrls: prev.imageUrls.concat(urls),
      }));

      setFiles([]);
    } catch (e) {
      setImageUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;

    // type
    if (id === "sell" || id === "rent") {
      setFormData((prev) => ({ ...prev, type: id }));
      return;
    }

    // checkboxes
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [id]: checked }));
      return;
    }

    // numbers
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [id]: Number(value) }));
      return;
    }

    // text inputs
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.imageUrls.length < 1) {
      setError("You must upload at least one image.");
      return;
    }

    if (formData.offer && formData.discountPrice >= formData.regularPrice) {
      setError("Discount price must be less than regular price.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/listing/update/${listingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ IMPORTANT (verifyToken uses cookie)
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update listing");

      navigate(`/listing/${data._id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Update a Listing</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        {/* Left */}
        <div className="flex flex-col gap-4 flex-1">
          <input
            type="text"
            placeholder="Name"
            className="border p-3 rounded-lg"
            id="name"
            maxLength="62"
            minLength="10"
            required
            onChange={handleChange}
            value={formData.name || ""}
          />

          <textarea
            placeholder="Description"
            className="border p-3 rounded-lg"
            id="description"
            required
            onChange={handleChange}
            value={formData.description || ""}
          />

          <input
            type="text"
            placeholder="Address"
            className="border p-3 rounded-lg"
            id="address"
            required
            onChange={handleChange}
            value={formData.address || ""}
          />

          <div className="flex gap-6 flex-wrap">
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="sell"
                className="w-5"
                onChange={handleChange}
                checked={formData.type === "sell"}
              />
              <span>Sell</span>
            </div>

            <div className="flex gap-2">
              <input
                type="checkbox"
                id="rent"
                className="w-5"
                onChange={handleChange}
                checked={formData.type === "rent"}
              />
              <span>Rent</span>
            </div>

            <div className="flex gap-2">
              <input
                type="checkbox"
                id="parking"
                className="w-5"
                onChange={handleChange}
                checked={!!formData.parking}
              />
              <span>Parking spot</span>
            </div>

            <div className="flex gap-2">
              <input
                type="checkbox"
                id="furnished"
                className="w-5"
                onChange={handleChange}
                checked={!!formData.furnished}
              />
              <span>Furnished</span>
            </div>

            <div className="flex gap-2">
              <input
                type="checkbox"
                id="offer"
                className="w-5"
                onChange={handleChange}
                checked={!!formData.offer}
              />
              <span>Offer</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bedrooms"
                min="1"
                max="10"
                required
                className="p-3 border border-gray-300 rounded-lg"
                onChange={handleChange}
                value={formData.bedrooms}
              />
              <p>Beds</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bathrooms"
                min="1"
                max="10"
                required
                className="p-3 border border-gray-300 rounded-lg"
                onChange={handleChange}
                value={formData.bathrooms}
              />
              <p>Baths</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="regularPrice"
                min="50"
                max="10000000"
                required
                className="p-3 border border-gray-300 rounded-lg"
                onChange={handleChange}
                value={formData.regularPrice}
              />
              <div className="flex flex-col items-center">
                <p>Regular price</p>
                {formData.type === 'rent' && (
                  <span className='text-xs'>($ / month)</span>
                )}
              </div>
            </div>

            {formData.offer && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="discountPrice"
                  min="0"
                  max="10000000"
                  required
                  className="p-3 border border-gray-300 rounded-lg"
                  onChange={handleChange}
                  value={formData.discountPrice}
                />
                <div className="flex flex-col items-center">
                  <p>Discounted price</p>
                 {formData.type === 'rent' && (
                    <span className='text-xs'>($ / month)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col flex-1 gap-4">
          <p className="font-semibold">
            Images:{" "}
            <span className="font-normal text-gray-600">
              The first image will be the cover (max {MAX_IMAGES})
            </span>
          </p>

          <div className="flex gap-4">
            <input
              className="p-3 border border-gray-300 rounded w-full"
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={handleImageSubmit}
              className="p-3 text-green-700 border border-green-700 rounded uppercase hover:shadow-lg disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          {imageUploadError ? (
            <p className="text-red-700 text-sm">{imageUploadError}</p>
          ) : null}

          {formData.imageUrls?.length > 0 &&
            formData.imageUrls.map((url, index) => (
              <div
                key={url}
                className="flex justify-between p-3 border items-center rounded-lg"
              >
                <img
                  src={url}
                  alt="listing"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="p-3 text-red-700 uppercase rounded-lg hover:opacity-75"
                >
                  Delete
                </button>
              </div>
            ))}

          <button
            disabled={loading || uploading}
            className="p-3 bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-70"
          >
            {loading ? "Updating..." : "Update listing"}
          </button>

          {error ? <p className="text-red-700 text-sm">{error}</p> : null}
        </div>
      </form>
    </main>
  );
}