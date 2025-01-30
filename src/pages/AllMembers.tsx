import { useState, useEffect } from "react";
import { fetchData, addMembers, getMemberSponsoredLegislation } from "../api/apiHelper";

const AllMembers = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [sponsoredLegislation, setSponsoredLegislation] = useState<any | null>(null);

  useEffect(() => {
    const url = `https://api.congress.gov/v3/member?limit=100&currentMember=true&format=json`;
    fetchInitialData(url);
  }, []);

  useEffect(() => {
    if (data.length > 0 && data[currentIndex]) {
      const currentMember = data[currentIndex];
      getMemberSponsoredLegislation(currentMember.bioguideId).then(setSponsoredLegislation);
    }
  }, [currentIndex, data]);

  const fetchInitialData = async (url: string) => {
    try {
      const { members, nextPageUrl } = await fetchData(url);
      const enrichedMembers = await addMembers(members);
      setData(enrichedMembers);
      setNextPageUrl(nextPageUrl);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (party: string) => {
    if (party === data[currentIndex]?.partyName) {
      setScore((prevScore) => prevScore + 1);
    }
    showNextMember();
  };

  const showNextMember = () => {
    if (currentIndex + 2 >= data.length && nextPageUrl) {
      setLoading(true);
      fetchInitialData(nextPageUrl);
    }

    setData((prevData) => {
      const updatedData = [...prevData];
      updatedData.splice(currentIndex, 1);
      return updatedData;
    });

    setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
  };

  if (loading && data.length === 0) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const currentMember = data[currentIndex];
  if (!currentMember) return <p>No members available.</p>;

  const imageUrl = currentMember.depiction?.imageUrl?.replace(/_200(?=[^_]*$)/, '');
  const currentTermLocation = currentMember.terms.item.at(-1)?.chamber || null;

  return (
    <div className="p-4 flex-1 overflow-hidden">
      <h1 className="text-xl font-bold">Congress Members</h1>

      {/* Rigid Layout */}
      <div className="mt-4 flex flex-col md:flex-row items-start justify-between gap-6 min-h-[500px] max-w-5xl mx-auto">

        {/* Member Info Card */}
        <div className="flex flex-col border p-4 rounded-lg shadow-md w-full md:w-1/2 min-h-[350px]">
          <div className="flex items-center border-b pb-4">
            <img
              src={imageUrl}
              alt={currentMember.name}
              className="w-24 h-24 mr-4 rounded-full object-cover"
              onError={(e) => (e.currentTarget.src = currentMember.depiction?.imageUrl)}
            />
            <div className="flex flex-col w-full">
              <p className="font-semibold text-lg">{currentMember.additionalInfo.directOrderName}   |   {currentMember.additionalInfo.bioguideId}</p>
              <p className="text-gray-600">{currentTermLocation}</p>
              <p className="text-sm text-gray-500">
                {currentMember.state} - District {currentMember.district}
              </p>
              <p className="text-sm text-gray-500">{currentMember.partyName} Party</p>
              <p className="text-sm text-gray-500 truncate">
                <a
                  href={currentMember.additionalInfo.officialWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {currentMember.additionalInfo.officialWebsiteUrl}
                </a>
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-2 text-sm text-gray-500 break-words">
            <p>
              <strong>Office:</strong> {currentMember.additionalInfo.addressInformation.officeAddress},{" "}
              {currentMember.additionalInfo.addressInformation.city}, {currentMember.additionalInfo.addressInformation.zipCode}
            </p>
            <p><strong>Phone:</strong> {currentMember.additionalInfo.addressInformation.phoneNumber}</p>
          </div>

          {/* Vote Buttons */}
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => handleVote("Democratic")}
              className="bg-blue-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 transition"
            >
              Democrat
            </button>
            <button
              onClick={() => handleVote("Republican")}
              className="bg-red-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-red-700 transition"
            >
              Republican
            </button>
          </div>

          {/* Score Display */}
          <p className="mt-2 text-center text-lg font-semibold">Score: {score}</p>
        </div>

        {/* Sponsored Legislation Card */}
        <div className="border p-4 rounded-lg shadow-md w-full md:w-1/2 min-h-[350px] overflow-hidden">
          <h2 className="text-lg font-semibold border-b pb-2">Sponsored Legislation</h2>
          <div className="mt-2 text-sm text-gray-600 h-[250px] overflow-auto break-words">
            {sponsoredLegislation === null ? (
              <p className="text-gray-500 mt-4">Fetching sponsored legislation...</p>
            ) : Array.isArray(sponsoredLegislation) && sponsoredLegislation.length > 0 ? (
              <ul className="list-disc pl-5">
                {sponsoredLegislation.map((bill, index) => (
                  <li key={index} className="mb-2">
                    {bill?.title || "No Title Available"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 mt-4">No sponsored legislation found for this member.</p>
            )}
          </div>
        </div>

      </div>


    </div>
  );
};

export default AllMembers;
