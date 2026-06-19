"use strict";

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {FieldValue, getFirestore} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const emailDocId = (email) => encodeURIComponent(normalizeEmail(email));
const errorDetails = (error) => ({
  code: error?.code || "unknown",
  message: error?.message || String(error || "Unknown server error"),
});

const registrationEmails = (registration) => Array.from(new Set([
  registration.leaderEmail,
  registration.accountEmail || "",
  ...((registration.members || []).map((member) => member.email || "")),
].map(normalizeEmail).filter(Boolean)));

const isAdminCaller = async (callerAuth) => {
  if (!callerAuth) return false;

  const callerEmail = normalizeEmail(callerAuth.token.email);
  const primaryAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

  if (primaryAdminEmail && callerEmail === primaryAdminEmail) return true;
  if (callerEmail === "kahabhns@gmail.com") return true;

  const adminSnapshot = await db.doc(`admins/${callerAuth.uid}`).get();
  return adminSnapshot.exists && adminSnapshot.get("active") !== false;
};

exports.deleteAuthUser = onCall(
  {region: process.env.FUNCTIONS_REGION || "us-central1"},
  async (request) => {
    try {
      const callerAuth = request.auth;
      if (!callerAuth) {
        throw new HttpsError("unauthenticated", "Sign in as an admin before deleting users.");
      }

      const uid = String(request.data?.uid || "").trim();
      if (!uid) {
        throw new HttpsError("invalid-argument", "A Firebase Auth uid is required.");
      }

      if (uid === callerAuth.uid) {
        throw new HttpsError("failed-precondition", "Admins cannot delete their own account from this panel.");
      }

      if (!(await isAdminCaller(callerAuth))) {
        throw new HttpsError("permission-denied", "Only admins can delete Firebase Auth accounts.");
      }

      const profileRef = db.doc(`userProfiles/${uid}`);
      const profileSnapshot = await profileRef.get();
      const profileData = profileSnapshot.exists ? profileSnapshot.data() || {} : {};
      const profileEmail = normalizeEmail(profileData.email);

      const allRegistrationsSnapshot = await db.collection("registrations").get();
      const allTeams = allRegistrationsSnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }));
      const ownedTeams = allTeams.filter((team) => team.userId === uid);
      const memberTeams = profileEmail
        ? allTeams.filter((team) => (
          !ownedTeams.some((ownedTeam) => ownedTeam.id === team.id)
          && (team.members || []).some((member) => normalizeEmail(member.email) === profileEmail)
        ))
        : [];

      try {
        await getAuth().deleteUser(uid);
      } catch (error) {
        if (error?.code !== "auth/user-not-found") {
          const details = errorDetails(error);
          console.error("deleteAuthUser auth deletion failed", {uid, ...details});
          throw new HttpsError(
            "failed-precondition",
            "Firebase Auth refused to delete this account.",
            details,
          );
        }
      }

      const batch = db.batch();
      batch.delete(profileRef);
      batch.delete(db.doc(`accountRegistrations/${uid}`));
      batch.delete(db.doc(`ideaSubmissions/${uid}`));
      if (profileEmail) batch.delete(db.doc(`participantEmails/${emailDocId(profileEmail)}`));

      ownedTeams.forEach((team) => {
        batch.delete(db.doc(`registrations/${team.id}`));
        batch.delete(db.doc(`teamNames/${team.id}`));
        batch.delete(db.doc(`finalists/${team.id}`));
        registrationEmails(team).forEach((email) => {
          batch.delete(db.doc(`participantEmails/${emailDocId(email)}`));
        });
      });

      memberTeams.forEach((team) => {
        const nextMembers = (team.members || []).filter((member) => normalizeEmail(member.email) !== profileEmail);
        batch.update(db.doc(`registrations/${team.id}`), {
          members: nextMembers,
          teamSize: nextMembers.length + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      try {
        await batch.commit();
      } catch (error) {
        const details = errorDetails(error);
        console.error("deleteAuthUser database cleanup failed", {uid, ...details});
        throw new HttpsError("internal", "Database cleanup failed.", details);
      }

      try {
        await db.collection("auditLogs").add({
          action: `Deleted Firebase Auth user ${profileEmail || uid}`,
          adminName: callerAuth.token.name || callerAuth.token.email || callerAuth.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error("deleteAuthUser audit log failed after successful delete", {
          uid,
          ...errorDetails(error),
        });
      }

      return {
        deletedUid: uid,
        deletedEmail: profileEmail,
        ownedTeamIds: ownedTeams.map((team) => team.id),
        updatedMemberTeamIds: memberTeams.map((team) => team.id),
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("deleteAuthUser unhandled failure", errorDetails(error));
      throw new HttpsError("internal", "Delete user account failed on the server.", errorDetails(error));
    }
  },
);
