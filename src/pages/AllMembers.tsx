import { useState, useEffect } from "react";
import axios from "axios";

const AllMembers = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
          const url = `https://api.congress.gov/v3/member?limit=5&api_key=${apiKey}&format=json`;
          const response = await axios.get(url);
          setData(response.data);
        } catch (err) {
          setError("Failed to fetch data");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, []);
  
    return (
      <div className="p-4 flex-1 overflow-auto">
        <h1 className="text-xl font-bold">Congress Members</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {data && (
          <ul className="mt-4">
            {data.members?.map((member: any) => (
              <li key={member.id} className="border-b py-4 flex items-center">
                <img src={member.depiction?.imageUrl} alt={member.name} className="w-16 h-16 mr-4 rounded-full" />
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.state} - District {member.district}</p>
                  <p className="text-sm text-gray-500">Party: {member.party}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  
  export default AllMembers;