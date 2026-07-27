'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
}

interface RoleItem {
  slug: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('viewer');

  function load() {
    apiFetch<UserItem[]>('/users').then((r) => {
      if (r.data) setUsers(r.data);
    });
    apiFetch<RoleItem[]>('/roles').then((r) => {
      if (r.data) setRoles(r.data.filter((role) => role.slug !== 'super_admin'));
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch('/users/invite', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email'),
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        roleSlug: form.get('roleSlug'),
      }),
    });
    if (result.ok) {
      setMessage('Invitation sent');
      setShowInvite(false);
      load();
    } else {
      setError(result.error?.message ?? 'Invite failed');
    }
  }

  async function onAssignRole(userId: string) {
    const result = await apiFetch('/users/assign-role', {
      method: 'POST',
      body: JSON.stringify({ userId, roleSlug: selectedRole }),
    });
    if (result.ok) {
      setMessage('Role updated');
      setAssigningUserId(null);
      load();
    } else {
      setError(result.error?.message ?? 'Role assignment failed');
    }
  }

  return (
    <ProtectedLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Users</h1>
        <button className="btn" onClick={() => setShowInvite(!showInvite)} type="button">
          Invite user
        </button>
      </div>

      {showInvite && (
        <form className="card" style={{ marginTop: '1rem', maxWidth: 520 }} onSubmit={onInvite}>
          <h3>Invite team member</h3>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" required />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" required />
          </div>
          <div className="field">
            <label htmlFor="roleSlug">Role</label>
            <select id="roleSlug" name="roleSlug" defaultValue="viewer">
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">Send invitation</button>
        </form>
      )}

      {message && <p className="success" style={{ marginTop: '1rem' }}>{message}</p>}
      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      <div className="card" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.status}</td>
                <td>{user.roles.join(', ') || '—'}</td>
                <td>
                  {assigningUserId === user.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        aria-label="Select role"
                      >
                        {roles.map((r) => (
                          <option key={r.slug} value={r.slug}>{r.name}</option>
                        ))}
                      </select>
                      <button className="btn" type="button" onClick={() => onAssignRole(user.id)}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        setAssigningUserId(user.id);
                        setSelectedRole(user.roles[0] ?? 'viewer');
                      }}
                    >
                      Change role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedLayout>
  );
}
