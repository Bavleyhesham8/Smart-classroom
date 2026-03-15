import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
    persist(
        (set, get) => ({
            // ── Theme ──
            theme: 'light',
            setTheme: async (t, email = null) => {
                set({ theme: t });
                if (t === 'dark') document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
                
                // If email is provided, persist to database
                if (email) {
                    try {
                        const axios = (await import('axios')).default;
                        await axios.patch('/api/users/theme', { email, theme: t });
                    } catch (e) {
                        console.error("Failed to persist theme", e);
                    }
                }
            },
            initTheme: (forcedTheme = null) => {
                const stored = localStorage.getItem('smartclass-store');
                let t = forcedTheme;
                if (!t && stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        t = parsed.state?.theme;
                    } catch (e) {
                        console.error("Theme parse error", e);
                    }
                }
                if (!t) t = get().theme || 'light';
                
                if (forcedTheme) set({ theme: forcedTheme });
                if (t === 'dark') document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
            },

            // ── User Profile Photo (base64) ──
            profilePhoto: null,
            setProfilePhoto: (photo) => set({ profilePhoto: photo }),

            // ── Face Captures (base64 array from CompleteProfile) ──
            faceCaptures: [],
            setFaceCaptures: (imgs) => set({ faceCaptures: imgs }),

            // ── Profile Completed flag ──
            profileCompleted: false,
            setProfileCompleted: (v) => set({ profileCompleted: v }),

            // ── Pending Users (signup requests) ──
            pendingUsers: [
                {
                    id: 'PU001',
                    parentName: 'Sarah Connor',
                    parentEmail: 'sarah.c@example.com',
                    parentPhone: '+1 (555) 800-1234',
                    childName: 'John Connor',
                    childGrade: 'Grade 10',
                    date: '2026-03-05',
                    status: 'Pending',
                },
            ],
            addPendingUser: (user) =>
                set((s) => ({ pendingUsers: [...s.pendingUsers, user] })),
            approveUser: (id) =>
                set((s) => {
                    const userToApprove = s.pendingUsers.find(u => u.id === id);
                    if (!userToApprove) return s;
                    return {
                        pendingUsers: s.pendingUsers.filter((u) => u.id !== id),
                        approvedUsers: [...(s.approvedUsers || []), {
                            ...userToApprove,
                            email: userToApprove.parentEmail, // for login lookup
                            name: userToApprove.parentName,
                            approved: true,
                            tempPassword: 'Smart@2026'
                        }],
                    };
                }),
            rejectUser: (id) =>
                set((s) => ({ pendingUsers: s.pendingUsers.filter((u) => u.id !== id) })),
            approvedUsers: [],

            // ── Reports (shared between Admin, Teacher, Parent) ──
            reports: [],
            setReports: (r) => set({ reports: r }),
            addReport: (r) => set((s) => ({ reports: [r, ...s.reports] })),
            approveReport: (id) =>
                set((s) => ({
                    reports: s.reports.map((r) =>
                        r.id === id
                            ? {
                                ...r,
                                status: 'Approved',
                                auditLog: [
                                    ...(r.auditLog || []),
                                    { date: new Date().toISOString(), action: 'Approved by Admin & pushed to Parent' },
                                ],
                            }
                            : r
                    ),
                })),
            refuseReport: (id, reason) =>
                set((s) => ({
                    reports: s.reports.map((r) =>
                        r.id === id
                            ? {
                                ...r,
                                status: 'Refused',
                                auditLog: [
                                    ...(r.auditLog || []),
                                    { date: new Date().toISOString(), action: `Refused by Admin: ${reason}` },
                                ],
                            }
                            : r
                    ),
                })),
            updateReportStatus: (id, status, logAction) =>
                set((s) => ({
                    reports: s.reports.map((r) =>
                        r.id === id
                            ? {
                                ...r,
                                status,
                                auditLog: [...(r.auditLog || []), { date: new Date().toISOString(), action: logAction }],
                            }
                            : r
                    ),
                })),

            // ── CV Integration placeholder state ──
            cvPipelineStatus: { running: false, fps: 0, studentsInFrame: 0, strangersActive: 0 },
            setCvPipelineStatus: (s) => set({ cvPipelineStatus: s }),

            // ── Settings modal open state ──
            isSettingsOpen: false,
            setSettingsOpen: (v) => set({ isSettingsOpen: v }),
            isEditPhotoOpen: false,
            setEditPhotoOpen: (v) => set({ isEditPhotoOpen: v }),
        }),
        {
            name: 'smartclass-store',
            // Only persist essential state, not functions
            partialize: (state) => ({
                theme: state.theme,
                profilePhoto: state.profilePhoto,
                faceCaptures: state.faceCaptures,
                profileCompleted: state.profileCompleted,
                pendingUsers: state.pendingUsers,
                approvedUsers: state.approvedUsers,
                reports: state.reports,
            }),
        }
    )
);

export default useStore;
