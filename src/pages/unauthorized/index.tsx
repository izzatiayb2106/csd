import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Unauthorized Access</h1>
      <p>You don't have permission to access this page.</p>
      <button onClick={() => navigate('/')}>
        Return to Home
      </button>
    </div>
  );
};

export default Unauthorized;