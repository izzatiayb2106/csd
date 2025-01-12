import Layout from "@/components/layout";
import * as React from "react";


// Define the type for the goal object
interface Goal {
  type: string;
  title: string;
  deadline: string;
  points: number; // Ensure points is a number
}


// Define the props for the GoalModal component
interface GoalModalProps {
  newGoal: Goal;
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>;
  onSave: () => void;
  onClose: () => void;
}

const GoalModal: React.FC<GoalModalProps> = ({ newGoal, setNewGoal, onSave, onClose }) => {
  return (
    <Layout>
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Set New Goal</h2>

        {/* Goal Type */}
        <label className="block mb-2">
          Goal Type:
          <select
            value={newGoal.type}
            onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
            className="block w-full mt-1 border rounded p-2"
          >
            <option value="short-term">Short-term</option>
            <option value="long-term">Long-term</option>
          </select>
        </label>

        {/* Goal Title */}
        <label className="block mb-2">
          Goal Title:
          <input
            type="text"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="block w-full mt-1 border rounded p-2"
            placeholder="Enter goal title"
          />
        </label>

        {/* Due Date */}
        <label className="block mb-2">
          Due Date:
          <input
            type="date"
            value={newGoal.deadline}
            onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
            className="block w-full mt-1 border rounded p-2"
          />
        </label>

        {/* Points */}
        <label className="block mb-4">
          Target Points:
          <input
            type="number"
            value={newGoal.points}
            onChange={(e) => setNewGoal({ ...newGoal, points: parseInt(e.target.value) })}
            className="block w-full mt-1 border rounded p-2"
            placeholder="Enter target points"
          />
        </label>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default GoalModal;