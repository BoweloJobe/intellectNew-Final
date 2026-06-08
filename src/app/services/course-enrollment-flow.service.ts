import type { CoursePaymentCaptureResult, CoursePaymentOrder } from "../models/payments";

export type CourseEnrollmentResult =
  | { kind: "free"; syncOk: boolean; joinedNewCourse: boolean }
  | { kind: "paid-redirect"; orderId: string; approvalUrl: string };

export type CoursePaymentCaptureOutcome =
  | { kind: "captured"; result: CoursePaymentCaptureResult }
  | { kind: "missing-return-data"; message: string };

export function isPaidCourse(price: number | null | undefined): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

export function isValidApprovalUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildCoursePaymentReturnUrl(params: {
  origin: string;
  courseId: string;
  returnTo: string;
}): string {
  const url = new URL(`/courses/${encodeURIComponent(params.courseId)}`, params.origin);
  url.searchParams.set("payment", "course");
  url.searchParams.set("courseId", params.courseId);
  url.searchParams.set("returnTo", params.returnTo);
  return url.toString();
}

export async function startCourseEnrollment(params: {
  courseId: string;
  price?: number | null;
  returnTo: string;
  origin: string;
  joinCourse: (courseId: string) => Promise<{ syncOk: boolean; joinedNewCourse: boolean }>;
  createPaymentOrder: (input: {
    courseId: string;
    returnUrl: string;
    cancelUrl: string;
  }) => Promise<CoursePaymentOrder>;
  redirectToApprovalUrl: (url: string) => void;
}): Promise<CourseEnrollmentResult> {
  if (!isPaidCourse(params.price)) {
    const result = await params.joinCourse(params.courseId);
    return { kind: "free", ...result };
  }

  const returnUrl = buildCoursePaymentReturnUrl({
    origin: params.origin,
    courseId: params.courseId,
    returnTo: params.returnTo,
  });
  const cancelUrl = returnUrl;
  const order = await params.createPaymentOrder({
    courseId: params.courseId,
    returnUrl,
    cancelUrl,
  });

  if (!isValidApprovalUrl(order.approvalUrl)) {
    throw new Error("Payment approval could not be started. Please try again or contact support.");
  }

  params.redirectToApprovalUrl(order.approvalUrl);
  return { kind: "paid-redirect", orderId: order.orderId, approvalUrl: order.approvalUrl };
}

export async function captureCoursePaymentReturn(params: {
  expectedCourseId: string;
  paymentType: string | null;
  paymentCourseId: string | null;
  orderToken: string | null;
  capturePayment: (input: { courseId: string; orderId: string }) => Promise<CoursePaymentCaptureResult>;
}): Promise<CoursePaymentCaptureOutcome | null> {
  if (params.paymentType !== "course") {
    return null;
  }

  if (params.paymentCourseId !== params.expectedCourseId || !params.orderToken) {
    return {
      kind: "missing-return-data",
      message: "Payment return is missing course or order information. Enrollment was not completed.",
    };
  }

  const result = await params.capturePayment({
    courseId: params.expectedCourseId,
    orderId: params.orderToken,
  });

  return { kind: "captured", result };
}
