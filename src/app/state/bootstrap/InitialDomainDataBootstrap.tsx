import { useEffect } from "react";
import { useCommunityState } from "../community/CommunityStateContext";
import { useCoursesState } from "../courses/CoursesStateContext";
import { useTutorState } from "../tutor/TutorStateContext";

export function InitialDomainDataBootstrap() {
  const community = useCommunityState();
  const courses = useCoursesState();
  const tutor = useTutorState();

  useEffect(() => {
    community.reloadCommunityData();
    // Enrollment data is the authoritative source for all student progress
    // on the student dashboard. The mock dashboard summary service is not
    // called here — student-facing stats derive from CoursesStateContext.
    courses.reloadEnrollments();
    tutor.reloadTutorData();
  }, []);

  return null;
}