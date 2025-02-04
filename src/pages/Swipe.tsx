import { useState, useEffect } from "react";
import fetchData from "../utils/apiHelper";
import { start } from "repl";

const Swipe = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sponsoredLegislation, setSponsoredLegislation] = useState<any | null>(null);

  // State for toggles
  const [partyEnabled, setPartyEnabled] = useState(true);
  const [stateEnabled, setStateEnabled] = useState(true);
  const [nameEnabled, setNameEnabled] = useState(true);

  // State for the name guess input field
  const [nameGuess, setNameGuess] = useState("");

  // State for the current question type
  const [questionType, setQuestionType] = useState<"party" | "state" | "name">("party");

  const membersPerRequest = 250; // Initial number of members to fetch
  const [memberRequestOffset, setMemberRequestOffset] = useState(membersPerRequest); // Tracks how many members we've fetched


  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const members = await fetchData(0, membersPerRequest);
        setData(members);
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    if (data.length > 0 && data[currentIndex]) {
      const currentMember = data[currentIndex];
      //setSponsoredLegislation(currentMember.sponsoredLegislation || null);
    }
  }, [currentIndex, data]);

  const handleVote = (party: string) => {
    const currentMember = data[currentIndex];
    console.log("VOTED: " + party + " FOR " + currentMember.party)
    if (questionType === "party" && party === currentMember.party) {
      setScore(prevScore => prevScore + 1);
    }
    showNextMember();
  };

  const handleStateAnswer = (state: string) => {
    const currentMember = data[currentIndex];
    if (questionType === "state" && state === currentMember.state) {
      setScore(prevScore => prevScore + 1);
    }
    showNextMember();
  };

  const handleNameAnswer = (name: string) => {
    const currentMember = data[currentIndex];
    if (questionType === "name" && currentMember.directOrderName?.toLowerCase() === name.toLowerCase()) {
      setScore(prevScore => prevScore + 1);
    }
    showNextMember();
  };

  const showNextMember = () => {
    if (currentIndex + 1 >= data.length) {
      setLoading(true);
      fetchData(memberRequestOffset, membersPerRequest).then(members => {
        setMemberRequestOffset(memberRequestOffset + membersPerRequest);
        setData(members);
        setCurrentIndex(0);
      });
    } else {
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
    updateQuestionType();
  };

  const updateQuestionType = () => {
    const enabledTypes: ("party" | "state" | "name")[] = [];

    if (partyEnabled) enabledTypes.push("party");
    if (stateEnabled) enabledTypes.push("state");
    if (nameEnabled) enabledTypes.push("name");

    if (enabledTypes.length > 0) {
      const randomIndex = Math.floor(Math.random() * enabledTypes.length);
      setQuestionType(enabledTypes[randomIndex]);
    }
  };

  useEffect(() => {
    updateQuestionType();
  }, [partyEnabled, stateEnabled, nameEnabled]);

  if (loading && data.length === 0) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const currentMember = data[currentIndex];
  if (!currentMember) return <p>No members available.</p>;

  const imageUrl = currentMember.depiction?.imageUrl?.replace(/_200(?=[^_]*$)/, "");
  const currentTermLocation = currentMember.terms.item.at(-1)?.chamber || null;

  const generateRandomStates = () => {
    const states = [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
      "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
      "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
      "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
      "West Virginia", "Wisconsin", "Wyoming"
    ];
    const randomStates = [...states].sort(() => 0.5 - Math.random()).slice(0, 3);
    randomStates.push(currentMember.state);
    return randomStates.sort(() => 0.5 - Math.random());
  };

  if (loading && data.length === 0) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!currentMember) return <p>No members available.</p>;

  return (
    <div className="p-4 flex-1 overflow-hidden">
      <h1 className="text-xl font-bold">Congress Members Quiz</h1>

      {/* Toggles for enabling/disabling question types */}
      <div className="mt-4">
        <div className="flex gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={partyEnabled}
              onChange={() => setPartyEnabled(prev => !prev)}
              id="partyToggle"
              className="mr-2"
            />
            <label htmlFor="partyToggle">Guess Their Party (Easy)</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={stateEnabled}
              onChange={() => setStateEnabled(prev => !prev)}
              id="stateToggle"
              className="mr-2"
            />
            <label htmlFor="stateToggle">Guess Their State (Medium)</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={nameEnabled}
              onChange={() => setNameEnabled(prev => !prev)}
              id="nameToggle"
              className="mr-2"
            />
            <label htmlFor="nameToggle">Guess Their Name (Hard)</label>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="mt-4 flex flex-col md:flex-row items-start justify-between gap-6 min-h-[500px] max-w-5xl mx-auto">

        {/* Member Info Card */}
        <div className="flex flex-col border p-4 rounded-lg shadow-md w-full md:w-1/2 min-h-[350px]">
          <div className="flex items-center border-b pb-4">
            <img
              src={imageUrl}
              alt={currentMember.name}
              className="w-24 h-24 mr-4 rounded-full object-cover"
              onError={e => (e.currentTarget.src = currentMember.depiction?.imageUrl)}
            />
            <div className="flex flex-col w-full">

              {questionType !== "name" && (
                <p className="font-semibold text-lg">{currentMember.directOrderName} </p>
              )}
              <div>
                <p>{currentMember.bioguideId}</p>
                <p className="text-gray-600">{currentTermLocation}</p>
              </div>

              {questionType !== "state" && currentMember.district && (
                <p className="text-sm text-gray-500">
                  {currentMember.state} - District {currentMember.district}
                </p>
              )}
            </div>
          </div>

          {/* Question Specific Content */}
          <div className="mt-4">
            {partyEnabled && questionType === "party" && (
              <div className="flex justify-center space-x-4">
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
            )}

            {stateEnabled && questionType === "state" && (
              <div className="flex justify-center space-x-4">
                {generateRandomStates().map((state, index) => (
                  <button
                    key={index}
                    onClick={() => handleStateAnswer(state)}
                    className="bg-gray-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-gray-700 transition"
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
            {nameEnabled && questionType === "name" && (
              <div className="flex justify-center">
                <input
                  type="text"
                  className="border p-2 rounded-md w-48"
                  placeholder="Enter name"
                  value={nameGuess}
                  onChange={(e) => setNameGuess(e.target.value)} // Track input value
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleNameAnswer(nameGuess); // Use the state value
                    }
                  }}
                />
                <button
                  onClick={() => handleNameAnswer(nameGuess)} // Use the state value
                  className="ml-2 bg-green-500 text-white py-2 px-4 rounded-md shadow-md hover:bg-green-700 transition"
                >
                  Guess
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sponsored Legislation Card */}
        <div className="border p-4 rounded-lg shadow-md w-full md:w-1/2 min-h-[350px] overflow-hidden">
          <h2 className="text-lg font-semibold border-b pb-2">Sponsored Legislation</h2>
          <div className="mt-2 text-sm text-white h-[250px] overflow-auto break-words">
            {sponsoredLegislation === null ? (
              <p className="text-gray-500 mt-4">Fetching sponsored legislation...</p>
            ) : Array.isArray(sponsoredLegislation) && sponsoredLegislation.length > 0 ? (
              <ul className="list-disc pl-5">
                {sponsoredLegislation.filter(bill => bill?.title).map((bill, index) => (
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

      {/* Score Display */}
      <p className="mt-2 text-center text-lg font-semibold">Score: {score}</p>
    </div>
  );
};

export default Swipe;
