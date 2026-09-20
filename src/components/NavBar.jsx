import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { currentUser, isAdmin, signOut } = useAuth();
  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">Emotion Labeling Study</span>
        <div className="navbar-links">
          <NavLink to="/task" className={({ isActive }) => (isActive ? 'active' : '')}>
            Label tweets
          </NavLink>
          <NavLink to="/my-submissions" className={({ isActive }) => (isActive ? 'active' : '')}>
            My submissions
          </NavLink>
          <NavLink to="/board" className={({ isActive }) => (isActive ? 'active' : '')}>
            Participant board
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
          )}
        </div>
        <div className="navbar-user">
          {currentUser.photoURL && <img src={currentUser.photoURL} alt="" />}
          <span>{currentUser.displayName}</span>
          <button className="btn btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </nav>
  );
}
