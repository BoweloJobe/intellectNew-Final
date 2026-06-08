export interface CreateCoursePaymentOrderInput {
  courseId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CoursePaymentOrder {
  orderId: string;
  amount: string;
  approvalUrl: string | null;
}

export interface CaptureCoursePaymentInput {
  courseId: string;
  orderId: string;
}

export interface CoursePaymentCaptureResult {
  enrollment: {
    id: string;
    courseId: string;
    enrolledAt: string;
  } | null;
  alreadyCaptured?: boolean;
  payment?: {
    id: string;
    status: string;
  };
}
