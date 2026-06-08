import { describe, expect, it, vi } from "vitest";
import {
  captureCoursePaymentReturn,
  startCourseEnrollment,
} from "./course-enrollment-flow.service";

describe("course enrollment payment flow", () => {
  it("uses free enrollment for a free course", async () => {
    const joinCourse = vi.fn().mockResolvedValue({ syncOk: true, joinedNewCourse: true });
    const createPaymentOrder = vi.fn();
    const redirectToApprovalUrl = vi.fn();

    const result = await startCourseEnrollment({
      courseId: "course-free",
      price: 0,
      returnTo: "/courses/course-free",
      origin: "https://app.example.test",
      joinCourse,
      createPaymentOrder,
      redirectToApprovalUrl,
    });

    expect(result).toEqual({ kind: "free", syncOk: true, joinedNewCourse: true });
    expect(joinCourse).toHaveBeenCalledWith("course-free");
    expect(createPaymentOrder).not.toHaveBeenCalled();
    expect(redirectToApprovalUrl).not.toHaveBeenCalled();
  });

  it("uses create-order for a paid course", async () => {
    const joinCourse = vi.fn();
    const createPaymentOrder = vi.fn().mockResolvedValue({
      orderId: "order-1",
      amount: "49.99",
      approvalUrl: "https://paypal.example.test/checkout?token=order-1",
    });
    const redirectToApprovalUrl = vi.fn();

    const result = await startCourseEnrollment({
      courseId: "course-paid",
      price: 49.99,
      returnTo: "/courses/course-paid",
      origin: "https://app.example.test",
      joinCourse,
      createPaymentOrder,
      redirectToApprovalUrl,
    });

    expect(result).toEqual({
      kind: "paid-redirect",
      orderId: "order-1",
      approvalUrl: "https://paypal.example.test/checkout?token=order-1",
    });
    expect(joinCourse).not.toHaveBeenCalled();
    expect(createPaymentOrder).toHaveBeenCalledWith({
      courseId: "course-paid",
      returnUrl: "https://app.example.test/courses/course-paid?payment=course&courseId=course-paid&returnTo=%2Fcourses%2Fcourse-paid",
      cancelUrl: "https://app.example.test/courses/course-paid?payment=course&courseId=course-paid&returnTo=%2Fcourses%2Fcourse-paid",
    });
    expect(redirectToApprovalUrl).toHaveBeenCalledWith("https://paypal.example.test/checkout?token=order-1");
  });

  it("does not call free enrollment for a paid course", async () => {
    const joinCourse = vi.fn();
    const createPaymentOrder = vi.fn().mockResolvedValue({
      orderId: "order-1",
      amount: "49.99",
      approvalUrl: "https://paypal.example.test/checkout?token=order-1",
    });

    await startCourseEnrollment({
      courseId: "course-paid",
      price: 1,
      returnTo: "/courses/course-paid",
      origin: "https://app.example.test",
      joinCourse,
      createPaymentOrder,
      redirectToApprovalUrl: vi.fn(),
    });

    expect(joinCourse).not.toHaveBeenCalled();
  });

  it("fails safely when approval URL is missing or invalid", async () => {
    const joinCourse = vi.fn();
    const createPaymentOrder = vi.fn().mockResolvedValue({
      orderId: "order-1",
      amount: "49.99",
      approvalUrl: "",
    });
    const redirectToApprovalUrl = vi.fn();

    await expect(
      startCourseEnrollment({
        courseId: "course-paid",
        price: 49.99,
        returnTo: "/courses/course-paid",
        origin: "https://app.example.test",
        joinCourse,
        createPaymentOrder,
        redirectToApprovalUrl,
      }),
    ).rejects.toThrow("Payment approval could not be started");

    expect(joinCourse).not.toHaveBeenCalled();
    expect(redirectToApprovalUrl).not.toHaveBeenCalled();
  });

  it("captures a paid course return only when provider order data is present", async () => {
    const capturePayment = vi.fn().mockResolvedValue({
      enrollment: { id: "enroll-1", courseId: "course-paid", enrolledAt: "2026-06-08T00:00:00.000Z" },
      payment: { id: "payment-1", status: "COMPLETED" },
    });

    const result = await captureCoursePaymentReturn({
      expectedCourseId: "course-paid",
      paymentType: "course",
      paymentCourseId: "course-paid",
      orderToken: "order-1",
      capturePayment,
    });

    expect(result).toEqual({
      kind: "captured",
      result: {
        enrollment: { id: "enroll-1", courseId: "course-paid", enrolledAt: "2026-06-08T00:00:00.000Z" },
        payment: { id: "payment-1", status: "COMPLETED" },
      },
    });
    expect(capturePayment).toHaveBeenCalledWith({ courseId: "course-paid", orderId: "order-1" });
  });

  it("does not capture when PayPal return data is missing", async () => {
    const capturePayment = vi.fn();

    const result = await captureCoursePaymentReturn({
      expectedCourseId: "course-paid",
      paymentType: "course",
      paymentCourseId: "course-paid",
      orderToken: null,
      capturePayment,
    });

    expect(result).toEqual({
      kind: "missing-return-data",
      message: "Payment return is missing course or order information. Enrollment was not completed.",
    });
    expect(capturePayment).not.toHaveBeenCalled();
  });
});
