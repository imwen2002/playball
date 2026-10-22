/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, PlayerSubmission } from './types';
import { Header } from './components/Header';
import { AssessmentForm } from './components/AssessmentForm';
import { AdminDashboard } from './components/AdminDashboard';
import { OfficialChartModal } from './components/OfficialChartModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import {
  subscribeToPlayers,
  savePlayerSubmission,
  deletePlayerSubmission,
  batchLoadSamplePlayers,
  batchDeletePlayers,
} from './firebase';
import { Award, Globe, Lock, KeyRound } from 'lucide-react';

const STORAGE_USER_KEY = 'badminton_tournament_user_v2';
const SESSION_ADMIN_UNLOCKED_KEY = 'badminton_admin_unlocked_v1';

export default function App() {
  // Navigation tabs: 'assessment' | 'admin' | 'chart'
  const [currentTab, setCurrentTab] = useState<'assessment' | 'admin' | 'chart'>('assessment');

  // Modals
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);

  // Admin password authentication state (persists in session)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_ADMIN_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // User state: starts completely blank by default (no hardcoded awenaiuse@gmail.com)
  const [user, setUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      email: '',
      name: '',
      isSignedIn: false,
    };
  });

  // Players roster from cloud database (starts empty, no default 16 sample players)
  const [players, setPlayers] = useState<PlayerSubmission[]>([]);

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    const unsubscribe = subscribeToPlayers(
      (cloudPlayers) => {
        setPlayers(cloudPlayers);
      },
      (err) => {
        console.warn('Realtime cloud sync error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync user state to localStorage for local device recall
  useEffect(() => {
    try {
      if (user.email) {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Find current user's existing submission from cloud roster if any
  const currentUserSubmission =
    players.find((p) => p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()) ||
    null;

  // Handle player submission directly to cloud database
  const handleSubmitPlayer = async (submission: PlayerSubmission) => {
    const activeUser: UserAccount = {
      email: submission.email,
      name: submission.name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        submission.name
      )}&backgroundColor=059669`,
      isSignedIn: true,
    };
    setUser(activeUser);

    // Save directly to Firebase Firestore
    await savePlayerSubmission(submission);
  };

  // Batch delete the 16 sample players from cloud Firestore
  const handleBatchDeleteSamplePlayers = async (samples: PlayerSubmission[]) => {
    const sampleEmails = new Set(samples.map((s) => s.email.toLowerCase()));
    const docIdsToDelete = new Set<string>();

    // 1. Add known sample template IDs and sanitized email IDs
    samples.forEach((s) => {
      if (s.id) docIdsToDelete.add(s.id);
      docIdsToDelete.add(s.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_'));
    });

    // 2. Also find any player in current roster matching sample emails or sample IDs
    players.forEach((p) => {
      if (sampleEmails.has(p.email.toLowerCase()) || p.id.startsWith('sample-')) {
        docIdsToDelete.add(p.id);
      }
    });

    await batchDeletePlayers(Array.from(docIdsToDelete));
  };

  const handleLogout = () => {
    setUser({
      email: '',
      name: '',
      isSignedIn: false,
    });
    try {
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // ignore
    }
  };

  // Tab switching with password gate
  const handleSelectTab = (tab: 'assessment' | 'admin' | 'chart') => {
    if (tab === 'chart') {
      setIsChartOpen(true);
      return;
    }
    if (tab === 'admin') {
      if (!isAdminAuthenticated) {
        setIsAdminPasswordModalOpen(true);
        return;
      }
      setCurrentTab('admin');
      return;
    }
    setCurrentTab(tab);
  };

  const handleAdminPasswordSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem(SESSION_ADMIN_UNLOCKED_KEY, 'true');
    } catch {
      // ignore
    }
    setIsAdminPasswordModalOpen(false);
    setCurrentTab('admin');
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(SESSION_ADMIN_UNLOCKED_KEY);
    } catch {
      // ignore
    }
    setCurrentTab('assessment');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Global Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        user={user}
        onLogout={handleLogout}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
        submissionCount={players.length}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'assessment' && (
          <AssessmentForm
            user={user}
            onSubmitPlayer={handleSubmitPlayer}
            existingSubmission={currentUserSubmission}
            onViewOfficialChart={() => setIsChartOpen(true)}
          />
        )}

        {currentTab === 'admin' &&
          (isAdminAuthenticated ? (
            <AdminDashboard
              players={players}
              onUpdatePlayers={setPlayers}
              onViewOfficialChart={() => setIsChartOpen(true)}
              onLockAdmin={handleLockAdmin}
              onDeletePlayer={deletePlayerSubmission}
              onSavePlayer={savePlayerSubmission}
              onBatchAddPlayers={batchLoadSamplePlayers}
              onBatchDeleteSamplePlayers={handleBatchDeleteSamplePlayers}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">主辦後台已受密碼保護</h3>
              <p className="text-xs text-slate-500">
                請輸入主辦人專屬密碼解鎖後台檢視名單與分組功能。
              </p>
              <button
                type="button"
                onClick={() => setIsAdminPasswordModalOpen(true)}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>輸入密碼解鎖後台</span>
              </button>
            </div>
          ))}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">義鼎杯羽球賽事程度自評與智慧分組系統</span>
            <span aria-hidden="true">·</span>
            <span>依據台灣羽球推廣協會 1~18 級制度 · 雲端持久儲存</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDeployGuideOpen(true)}
              className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>部署到 GitHub / Google</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsChartOpen(true)}
              className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>1~18級完整說明</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Official 1~18 Level Chart Modal */}
      <OfficialChartModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        selectedLevel={currentUserSubmission?.level}
      />

      {/* Deployment Guide Modal */}
      <DeploymentGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />

      {/* Admin Password Gate Modal */}
      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onSuccess={handleAdminPasswordSuccess}
        onCancel={() => setIsAdminPasswordModalOpen(false)}
      />
    </div>
  );
}
