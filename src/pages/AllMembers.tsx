import { useState, useEffect } from "react";
import axios from "axios";

const AllMembers = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Function to fetch the initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
        const url = `https://api.congress.gov/v3/member?limit=20&currentMember=true&api_key=${apiKey}&format=json`;
        const response = await axios.get(url);
        addMembers(response.data.members);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to append new members to the stack
  const addMembers = (members: any[]) => {
    // Shuffle the incoming members
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    setData((prevData) => [...prevData, ...shuffled]);
  };

  // Function to show the next member when clicked
  const showNextMember = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
  };

  // Handle loading and errors
  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  // Get the current member to display
  const currentMember = data[currentIndex];
  if (!currentMember) return <p>No members available.</p>;

  // Clean up the image URL
  const imageUrl = currentMember.depiction?.imageUrl?.replace(/_200(?=[^_]*$)/, '');

  return (
    <div className="p-4 flex-1 overflow-auto">
      <h1 className="text-xl font-bold">Congress Members</h1>
      <div className="mt-4 flex items-center border-b py-4">
        <img
          src={imageUrl}
          alt={currentMember.name}
          className="w-16 h-16 mr-4 rounded-full object-cover"
          onClick={showNextMember}
          onError={(e) => {
            // If the modified image fails, fallback to the original image with '_200'
            e.currentTarget.src = currentMember.depiction?.imageUrl;
          }}
        />
        <div>
          <p className="font-semibold">{currentMember.name}</p>
          <p className="text-sm text-gray-600">
            {currentMember.state} - District {currentMember.district}
          </p>
          <p className="text-sm text-gray-500">{currentMember.partyName} Party</p>
        </div>
      </div>
    </div>
  );
};

export default AllMembers;
