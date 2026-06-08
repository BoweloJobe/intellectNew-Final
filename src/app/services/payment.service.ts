import { httpClient, toApiError } from "../api";
import { readStoredAuthSession } from "../auth/auth-storage";
import type {
  CaptureCoursePaymentInput,
  CoursePaymentCaptureResult,
  CoursePaymentOrder,
  CreateCoursePaymentOrderInput,
} from "../models/payments";

type BackendCreateOrderResponse = {
  data: CoursePaymentOrder;
};

type BackendCaptureResponse = {
  data: CoursePaymentCaptureResult;
};

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createCoursePaymentOrder(
  input: CreateCoursePaymentOrderInput,
): Promise<CoursePaymentOrder> {
  try {
    const response = await httpClient.post<
      BackendCreateOrderResponse,
      { returnUrl: string; cancelUrl: string }
    >(`/payments/courses/${encodeURIComponent(input.courseId)}/create-order`, {
      body: {
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
      },
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    throw toApiError(error, { operation: "payments.createCoursePaymentOrder" });
  }
}

export async function captureCoursePayment(
  input: CaptureCoursePaymentInput,
): Promise<CoursePaymentCaptureResult> {
  try {
    const response = await httpClient.post<
      BackendCaptureResponse,
      { orderId: string }
    >(`/payments/courses/${encodeURIComponent(input.courseId)}/capture`, {
      body: { orderId: input.orderId },
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    throw toApiError(error, { operation: "payments.captureCoursePayment" });
  }
}
