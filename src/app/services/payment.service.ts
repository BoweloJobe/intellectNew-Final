import { httpClient, toApiError } from "../api";
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
    });

    return response.data;
  } catch (error) {
    throw toApiError(error, { operation: "payments.captureCoursePayment" });
  }
}
