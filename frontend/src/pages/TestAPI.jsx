import React, { useState } from 'react';
import api from '../api/axios';

const TestAPI = () => {
  const [result, setResult] = useState('');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const testProfile = async () => {
    try {
      setResult('Đang gọi API...');
      const res = await api.get(`users/profile/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setResult(`Lỗi: ${err.response?.status} - ${JSON.stringify(err.response?.data, null, 2)}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test API Profile</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold">LocalStorage Info:</h2>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Token:</strong> {token ? 'Có token' : 'Không có token'}</p>
        <p><strong>Token preview:</strong> {token?.substring(0, 50)}...</p>
      </div>

      <button
        onClick={testProfile}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test API Profile
      </button>

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h2 className="font-bold mb-2">Kết quả:</h2>
        <pre className="whitespace-pre-wrap text-sm">{result}</pre>
      </div>
    </div>
  );
};

export default TestAPI;
