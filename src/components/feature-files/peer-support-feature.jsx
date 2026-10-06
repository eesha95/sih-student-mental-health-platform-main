// components/feature-files/peer-support-feature.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureViewer from '../FeatureViewer';
import { useAuth } from '../../context/AuthContext';

const POST_CATEGORIES = ['General', 'Anxiety', 'Depression', 'Stress', 'Motivation', 'Hostel Life'];

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso + 'Z').getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

const SupportNotice = ({ support, onClose }) => (
  <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50">
    <div className="flex justify-between items-start">
      <h4 className="font-semibold text-red-800 mb-2">We're here for you 💙</h4>
      <button onClick={onClose} className="text-red-500 hover:text-red-700 text-sm">Dismiss</button>
    </div>
    <p className="text-sm text-red-700 mb-3">
      It sounds like you're going through something really painful. Your message has been shared privately with our care team
      instead of the community feed. Please reach out to someone right now:
    </p>
    <ul className="text-sm text-red-800 space-y-1">
      {support.emergency_contacts.map((c) => (
        <li key={c.name}><strong>{c.name}:</strong> <a className="underline" href={`tel:${c.number.split('/')[0].replace(/[^+\d]/g, '')}`}>{c.number}</a> ({c.available})</li>
      ))}
    </ul>
  </div>
);

const PeerSupportFeature = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [supportInfo, setSupportInfo] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [postCategory, setPostCategory] = useState('General');
  const [postAnonymously, setPostAnonymously] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [openReplies, setOpenReplies] = useState({}); // postId -> replies[]
  const [replyDrafts, setReplyDrafts] = useState({});

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  };

  const run = async (fn) => {
    setError('');
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const loadGroups = () => run(async () => setGroups(await apiRequest('/api/peer/groups')));
  const loadPosts = () => run(async () => setPosts(await apiRequest(`/api/peer/posts?category=${encodeURIComponent(categoryFilter)}`)));
  const loadSessions = () => run(async () => setSessions(await apiRequest('/api/peer/sessions')));

  useEffect(() => {
    Promise.all([loadGroups(), loadSessions()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const confirmJoinGroup = async () => {
    const group = selectedGroup;
    setSelectedGroup(null);
    const result = await run(() => apiRequest(`/api/peer/groups/${group.id}/join`, { method: 'POST' }));
    if (result) {
      showNotice(`You joined ${group.name}. See you at the next meeting: ${group.meeting_time}`);
      loadGroups();
    }
  };

  const leaveGroup = async (group) => {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    if (await run(() => apiRequest(`/api/peer/groups/${group.id}/leave`, { method: 'POST' }))) loadGroups();
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setIsPosting(true);
    const result = await run(() => apiRequest('/api/peer/posts', {
      method: 'POST',
      body: JSON.stringify({ content: newPost, category: postCategory, is_anonymous: postAnonymously })
    }));
    setIsPosting(false);
    if (!result) return;
    setNewPost('');
    if (result.held_for_review) {
      setSupportInfo(result.support);
    } else {
      showNotice('Your post has been shared with the community!');
    }
    loadPosts();
  };

  const toggleLike = async (postId) => {
    const updated = await run(() => apiRequest(`/api/peer/posts/${postId}/like`, { method: 'POST' }));
    if (updated) setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  };

  const toggleReplies = async (postId) => {
    if (openReplies[postId]) {
      setOpenReplies((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }
    const replies = await run(() => apiRequest(`/api/peer/posts/${postId}/replies`));
    if (replies) setOpenReplies((prev) => ({ ...prev, [postId]: replies }));
  };

  const submitReply = async (postId) => {
    const content = (replyDrafts[postId] || '').trim();
    if (!content) return;
    const result = await run(() => apiRequest(`/api/peer/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content, is_anonymous: true })
    }));
    if (!result) return;
    setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    if (result.held_for_review) {
      setSupportInfo(result.support);
      return;
    }
    setOpenReplies((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), result.reply] }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, replies: p.replies + 1 } : p)));
  };

  const reportPost = async (postId) => {
    const reason = window.prompt('Why are you reporting this post? (optional)');
    if (reason === null) return;
    const result = await run(() => apiRequest(`/api/peer/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason }) }));
    if (result) showNotice(result.message);
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete your post?')) return;
    if (await run(() => apiRequest(`/api/peer/posts/${postId}`, { method: 'DELETE' }))) loadPosts();
  };

  const toggleSession = async (session) => {
    const result = await run(() => apiRequest(`/api/peer/sessions/${session.id}/register`, { method: 'POST' }));
    if (result) {
      showNotice(result.registered ? `You're registered for ${session.title}. We'll remind you before it starts.` : `Registration for ${session.title} cancelled.`);
      loadSessions();
    }
  };

  return (
    <FeatureViewer title="Peer Support Community">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => navigate('/resources')}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>📚</span>
            <span>Resources</span>
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {supportInfo && <SupportNotice support={supportInfo} onClose={() => setSupportInfo(null)} />}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'groups', label: 'Support Groups', icon: '👥' },
          { id: 'community', label: 'Community Posts', icon: '💬' },
          { id: 'sessions', label: 'Live Sessions', icon: '📅' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Loading community...</div>}

      {/* Support Groups Tab */}
      {!loading && activeTab === 'groups' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Join a Support Group</h3>
            <div className="text-sm text-gray-600">
              {groups.filter(g => g.is_active).length} active groups
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {groups.map(group => (
              <div key={group.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{group.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{group.name}</h4>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {group.category}
                      </span>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${group.is_active ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{group.description}</p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Members:</span>
                    <span>{group.members}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderator:</span>
                    <span>{group.moderator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meets:</span>
                    <span>{group.meeting_time}</span>
                  </div>
                </div>

                {group.joined ? (
                  <div className="flex gap-2">
                    <span className="flex-1 py-2 rounded-lg font-medium text-center bg-green-100 text-green-800">✓ Joined</span>
                    <button onClick={() => leaveGroup(group)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                      Leave
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedGroup(group)}
                    disabled={!group.is_active}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      group.is_active
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {group.is_active ? 'Join Group' : 'Currently Inactive'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Posts Tab */}
      {!loading && activeTab === 'community' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Community Posts</h3>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All topics</option>
              {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Create New Post */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Share with the Community</h4>
            <form onSubmit={handleCreatePost}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share your thoughts, experiences, or ask for support..."
                rows="3"
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
              />
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} className="border border-gray-300 rounded px-2 py-1">
                    {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" checked={postAnonymously} onChange={(e) => setPostAnonymously(e.target.checked)} />
                    Post anonymously
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!newPost.trim() || isPosting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {isPosting ? 'Posting...' : 'Share Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Community Posts List */}
          <div className="space-y-4">
            {posts.length === 0 && (
              <p className="text-center text-gray-500 py-6">No posts yet — be the first to share something kind.</p>
            )}
            {posts.map(post => (
              <div key={post.id} className={`bg-white border rounded-lg p-4 ${post.is_hidden ? 'opacity-70 border-dashed' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {post.is_anonymous ? '🎭' : '👤'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{post.author}{post.is_mine && <span className="text-xs text-gray-500"> (you)</span>}</p>
                      <p className="text-sm text-gray-600">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    {post.category}
                  </span>
                </div>

                {post.is_hidden && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">
                    Only you can see this post — it's waiting for a moderator to review it.
                  </p>
                )}

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

                {!post.is_hidden && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <button onClick={() => toggleLike(post.id)} className={`flex items-center space-x-1 transition-colors ${post.liked_by_me ? 'text-blue-600' : 'hover:text-blue-600'}`}>
                      <span>👍</span>
                      <span>{post.likes}</span>
                    </button>
                    <button onClick={() => toggleReplies(post.id)} className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                      <span>💬</span>
                      <span>{post.replies} {post.replies === 1 ? 'reply' : 'replies'}</span>
                    </button>
                    {post.is_mine ? (
                      <button onClick={() => deletePost(post.id)} className="hover:text-red-600 transition-colors">Delete</button>
                    ) : (
                      <button onClick={() => reportPost(post.id)} className="hover:text-red-600 transition-colors">Report</button>
                    )}
                  </div>
                )}
                {post.is_hidden && post.is_mine && (
                  <button onClick={() => deletePost(post.id)} className="text-sm text-gray-600 hover:text-red-600">Delete</button>
                )}

                {openReplies[post.id] && (
                  <div className="mt-4 pl-4 border-l-2 border-blue-100 space-y-3">
                    {openReplies[post.id].map((r) => (
                      <div key={r.id} className="text-sm">
                        <span className="font-medium text-gray-800">{r.author}{r.is_mine && ' (you)'}</span>
                        <span className="text-gray-500"> · {timeAgo(r.created_at)}</span>
                        <p className="text-gray-700 whitespace-pre-wrap">{r.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={replyDrafts[post.id] || ''}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && submitReply(post.id)}
                        maxLength={1000}
                        placeholder="Write a supportive reply (posted anonymously)..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <button onClick={() => submitReply(post.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm">
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Sessions Tab */}
      {!loading && activeTab === 'sessions' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Live Sessions</h3>

          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{session.title}</h4>
                    <p className="text-gray-600 text-sm mb-2">{session.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>🕒 {new Date(session.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      <span>⏱️ {session.duration_minutes} minutes</span>
                      <span>👥 {session.participants} attending</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      session.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {session.type === 'group' ? 'Support Group' : 'Workshop'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <strong>Facilitator:</strong> {session.facilitator}
                  </p>
                  <button
                    onClick={() => toggleSession(session)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      session.registered
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {session.registered ? '✓ Registered (cancel)' : 'Register'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {sessions.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">No Upcoming Sessions</h4>
              <p className="text-gray-600">Check back later for new live support sessions and workshops.</p>
            </div>
          )}
        </div>
      )}

      {/* Join Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Join {selectedGroup.name}?
            </h3>

            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-3">{selectedGroup.description}</p>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <h4 className="font-medium text-blue-900 mb-2">Group Guidelines:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Respect others' privacy and experiences</li>
                  <li>• No judgment or unsolicited advice</li>
                  <li>• Keep discussions confidential</li>
                  <li>• Follow community guidelines</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmJoinGroup}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Join Group
              </button>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Info */}
      <div className="mt-8 bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">About Peer Support</h4>
        <p className="text-green-800 text-sm mb-2">
          Connect with others who understand your journey. Posts are screened for safety, and anything reported
          by several students is hidden until a moderator reviews it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
          <div>
            <p><strong>🛡️ Safe Environment:</strong> Moderated community</p>
            <p><strong>🤝 Mutual Support:</strong> Help and be helped by peers</p>
          </div>
          <div>
            <p><strong>🎭 Anonymous Options:</strong> Share comfortably and safely</p>
            <p><strong>📅 Regular Sessions:</strong> Weekly group meetings and workshops</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-green-100 rounded-lg">
          <p className="text-xs text-green-700">
            <strong>Remember:</strong> Peer support complements but doesn't replace professional treatment.
            If you're in crisis, call Tele-MANAS at 14416 or emergency services at 112.
          </p>
        </div>
      </div>
    </FeatureViewer>
  );
};

export default PeerSupportFeature;
