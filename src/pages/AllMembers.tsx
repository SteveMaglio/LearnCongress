import { useState, useEffect } from "react";
import axios from "axios";

const AllMembers = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null); // State to store the next page URL

  // Function to fetch paginated data for infinite swiping
  const fetchData = async (url: string) => {
    try {
      const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
      // Append the API key to the URL
      const fullUrl = `${url}&api_key=${apiKey}`;
      const response = await axios.get(fullUrl);
      // Save the pagination URL for the next request
      setNextPageUrl(response.data.pagination?.next || null);
      addMembers(response.data.members);
    } catch (err) {
      setError("Failed to fetch data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch initial data
  useEffect(() => {
    const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
    const url = `https://api.congress.gov/v3/member?limit=100&currentMember=true&api_key=${apiKey}&format=json`;
    fetchData(url);
  }, []);

  const addMembers = async (members: any[]) => {
    // Fetch additional data for each member using their bioguideId
    const membersWithAdditionalData = await Promise.all(
      members.map(async (member) => {
        try {
          const bioguideId = member.bioguideId;
          const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
          const url = `https://api.congress.gov/v3/member/${bioguideId}?api_key=${apiKey}&format=json`;
          const response = await axios.get(url);
  
          // Append the fetched data to the member object
          return { ...member, additionalInfo: response.data.member };
        } catch (error) {
          console.error(`Failed to fetch additional info for ${member.name}:`, error);
          return member; // Return the member as is in case of error
        }
      })
    );
  
    // Shuffle the members after the additional data is fetched
    const shuffled = [...membersWithAdditionalData].sort(() => Math.random() - 0.5);
  
    // Append the shuffled members with additional data to the current stack
    setData((prevData) => [...prevData, ...shuffled]);
  };
  

// Function to show the next member when clicked
const showNextMember = () => {
  console.log("STEVE DEBUG: INDEX IS " + currentIndex);

  // Preemptively load more data when we're about 2 members away from the end
  if (currentIndex + 2 >= data.length && nextPageUrl) {
    setLoading(true);
    fetchData(nextPageUrl); // Fetch the next page of members
  }

  // Pop the current member from the list to avoid repeats
  setData((prevData) => {
    const updatedData = [...prevData];
    updatedData.splice(currentIndex, 1); // Remove the current member
    return updatedData;
  });

  // Move to the next member
  setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
};


  // Handle loading and errors
  if (loading && data.length === 0) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  // Get the current member to display
  const currentMember = data[currentIndex];
  if (!currentMember) return <p>No members available.</p>;

  // Clean up the image URL
  const imageUrl = currentMember.depiction?.imageUrl?.replace(/_200(?=[^_]*$)/, '');

  console.log(currentMember);

  return (
    <div className="p-4 flex-1 overflow-auto">
      <h1 className="text-xl font-bold">Congress Members</h1>
      <div className="mt-4 flex items-center border-b py-4">
        <img
          src={imageUrl}
          alt={currentMember.name}
          className="w-16 h-16 mr-4 rounded-full object-contain"
          onClick={showNextMember}
          onError={(e) => {
            // If the modified image fails, fallback to the original image with '_200'
            e.currentTarget.src = currentMember.depiction?.imageUrl;
          }}
          style={{ maxWidth: '100%', maxHeight: '100%'}} // Ensures images fit well within the allocated space
        />
        <div>
          <p className="font-semibold">{currentMember.additionalInfo.directOrderName}</p>
          <p className="text-sm text-gray-600">
            {currentMember.state} - District {currentMember.district}
          </p>
          <p className="text-sm text-gray-500">{currentMember.partyName} Party</p>
          <p className="text-sm text-gray-500">
            <a
              href={currentMember.additionalInfo.officialWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {currentMember.additionalInfo.officialWebsiteUrl}
            </a>
          </p>
          <p className="text-sm text-gray-500">{currentMember.additionalInfo.addressInformation.officeAddress} {currentMember.additionalInfo.addressInformation.city} {currentMember.additionalInfo.addressInformation.district} {currentMember.additionalInfo.addressInformation.zipCode}</p>
          <p className="text-sm text-gray-500">{currentMember.additionalInfo.addressInformation.phoneNumber}</p>
        </div>
      </div>
    </div>
  );
};

export default AllMembers;