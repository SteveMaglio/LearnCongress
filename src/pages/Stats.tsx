import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart, Bar, CartesianGrid, Legend } from "recharts";
import ReactTooltip from "react-tooltip";

// Dummy data
const getOverallAccuracy = () => 72; // 72% accuracy
const getAccuracyByState = () => ({
  CA: 78,
  TX: 60,
  NY: 85,
  FL: 50,
  OH: 45,
});
const getPartyAccuracy = () => ({
  Democratic: 80,
  Republican: 72,
  Independent: 50,
});
const getRollingAccuracy = () =>
  Array.from({ length: 50 }, (_, i) => ({
    attempt: i + 1,
    accuracy: Math.floor(Math.random() * (90 - 40 + 1)) + 40,
  }));
const getTopWeakestStates = () => [
  { state: "Ohio", accuracy: 45 },
  { state: "Florida", accuracy: 50 },
  { state: "Texas", accuracy: 60 },
  { state: "Georgia", accuracy: 62 },
  { state: "Michigan", accuracy: 65 },
];

const Stats: React.FC = () => {
  const overallAccuracy = getOverallAccuracy();
  const stateAccuracy = getAccuracyByState();
  const partyAccuracy = getPartyAccuracy();
  const rollingAccuracy = getRollingAccuracy();
  const topWeakStates = getTopWeakestStates();

  // State to track hovered state on map
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Your Study Statistics</h1>
      <p className="text-lg">Overall Accuracy: <span className="font-semibold">{overallAccuracy}%</span></p>

      {/* Interactive Map Placeholder */}
      <div className="relative mt-6">
        <h2 className="text-xl font-semibold">🗺️ Accuracy by State</h2>
        <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
          <p className="text-gray-600">US Map Placeholder</p>
        </div>
      </div>

      {/* Party Accuracy Bar Chart */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">🏛️ Accuracy by Political Party</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={Object.entries(partyAccuracy).map(([party, accuracy]) => ({ party, accuracy }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="party" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="accuracy" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rolling Accuracy Line Chart */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">📈 Rolling Accuracy (Last 50 Guesses)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={rollingAccuracy}>
            <XAxis dataKey="attempt" />
            <YAxis domain={[40, 90]} />
            <Tooltip />
            <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 Weakest States */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">📌 Top 5 Weakest States</h2>
        <ul className="list-disc pl-5">
          {topWeakStates.map((state, index) => (
            <li key={index} className="text-red-500 font-semibold">
              {state.state} - {state.accuracy}% Accuracy
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Stats;
