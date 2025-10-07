// Debug component to show current user info and navigation
// File: src/components/UserRoleDebug.jsx

import React from 'react';
import { Card, Button, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isAdmin, isModerator, isAdminOrModerator } from '../features/auth/services/authService';

export default function UserRoleDebug() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  if (!user) {
    return (
      <Card className="mb-3">
        <Card.Body>
          <Card.Title>User Role Debug</Card.Title>
          <Card.Text className="text-muted">No user logged in</Card.Text>
          <Button variant="primary" onClick={() => navigate('/auth/login')}>
            Go to Login
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const roleVariant = user.role === 'admin' ? 'danger' : 
                     user.role === 'moderator' ? 'warning' : 'primary';

  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title className="d-flex align-items-center gap-2">
          User Role Debug 
          <Badge bg={roleVariant}>{user.role.toUpperCase()}</Badge>
        </Card.Title>
        
        <Row>
          <Col md={6}>
            <Card.Text>
              <strong>Name:</strong> {user.name}<br />
              <strong>Email:</strong> {user.email}<br />
              <strong>Role:</strong> {user.role}<br />
              <strong>Email Verified:</strong> {user.email_verified ? '✅' : '❌'}
            </Card.Text>
          </Col>
          <Col md={6}>
            <Card.Text>
              <strong>Permissions:</strong><br />
              Admin: {isAdmin() ? '✅' : '❌'}<br />
              Moderator: {isModerator() ? '✅' : '❌'}<br />
              Admin/Mod: {isAdminOrModerator() ? '✅' : '❌'}
            </Card.Text>
          </Col>
        </Row>

        <div className="mt-3">
          <h6>Quick Navigation:</h6>
          <div className="d-flex gap-2 flex-wrap">
            <Button size="sm" variant="outline-primary" onClick={() => navigate('/home')}>
              Home
            </Button>
            
            {isAdminOrModerator() && (
              <>
                <Button size="sm" variant="outline-danger" onClick={() => navigate('/admin/dashboard')}>
                  Admin Dashboard
                </Button>
                <Button size="sm" variant="outline-warning" onClick={() => navigate('/admin/users')}>
                  Users
                </Button>
                <Button size="sm" variant="outline-info" onClick={() => navigate('/admin/listing-queue')}>
                  Listing Queue
                </Button>
              </>
            )}
            
            <Button size="sm" variant="outline-secondary" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            
            <Button 
              size="sm" 
              variant="outline-dark" 
              onClick={() => {
                localStorage.removeItem('revibe_auth');
                navigate('/auth/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}