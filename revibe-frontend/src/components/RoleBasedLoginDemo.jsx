// Demo component để test role-based login functionality
// File: src/components/RoleBasedLoginDemo.jsx

import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { redirectByRole } from '../features/auth/services/authService';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const LS_AUTH_KEY = "revibe_auth";

export default function RoleBasedLoginDemo() {
  const navigate = useNavigate();
  
  const testRoleLogin = async (email, password, expectedRole) => {
    try {
      // Simulate login
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Login failed: ${data.error}`);
        return;
      }

      const data = await res.json();
      
      // Save to localStorage
      localStorage.setItem(LS_AUTH_KEY, JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      }));

      alert(`Login successful!\nUser: ${data.user.name}\nRole: ${data.user.role}\nRedirecting based on role...`);
      
      // Use role-based redirection
      setTimeout(() => redirectByRole(data.user, navigate), 1000);
      
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const testUsers = [
    {
      name: "Admin User",
      email: "admin@revibe.vn",
      password: "123456", // You'll need to set this or use OTP
      role: "admin",
      description: "Should redirect to /admin/dashboard"
    },
    {
      name: "Regular User",
      email: "buyer@revibe.vn", 
      password: "123456",
      role: "user",
      description: "Should redirect to /home"
    }
  ];

  return (
    <div className="container mt-4">
      <h2>Role-Based Login Demo</h2>
      <Alert variant="info">
        <strong>How to test:</strong>
        <ol>
          <li>Make sure the backend is running</li>
          <li>Run the seed command: <code>POST /dev/seed-all</code> to create test users</li>
          <li>Set passwords for test users or use OTP login</li>
          <li>Click the test buttons below to see role-based redirection</li>
        </ol>
      </Alert>

      <div className="row">
        {testUsers.map((user) => (
          <div key={user.email} className="col-md-6 mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{user.name}</Card.Title>
                <Card.Text>
                  <strong>Email:</strong> {user.email}<br />
                  <strong>Expected Role:</strong> {user.role}<br />
                  <strong>Expected Redirect:</strong> {user.description}
                </Card.Text>
                <Button 
                  variant="primary" 
                  onClick={() => testRoleLogin(user.email, user.password, user.role)}
                >
                  Test Login as {user.role}
                </Button>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>

      <Alert variant="warning" className="mt-4">
        <strong>Note:</strong> The test users created by <code>/dev/seed-all</code> don't have passwords by default. 
        You'll need to either:
        <ul>
          <li>Add password hashes to the seed script, OR</li>
          <li>Use the OTP login flow for testing, OR</li>
          <li>Manually set passwords through the admin interface</li>
        </ul>
      </Alert>
    </div>
  );
}