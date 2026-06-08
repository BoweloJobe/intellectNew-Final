import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  saveNotificationSettings,
  saveProfileSettings,
  saveSecuritySettings,
  type NotificationSettingsInput,
  type ProfileSettingsInput,
  type SecuritySettingsInput,
} from "../services/form-flows.service";
import { User, Bell, Lock, CreditCard, Eye, EyeOff } from "lucide-react";
import {
  confirmPasswordRules,
  emailRules,
  normalizeEmailInput,
  normalizeRequiredTextInput,
  optionalTrimmedTextRules,
  passwordRules,
  trimmedTextRules,
} from "../utils/form-validation";
import { useAuth } from "../auth/AuthContext";

function formatStatusLabel(status: string): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, subscription, signOut, updateCurrentUserProfile } = useAuth();
  const profileDefaults = useMemo<ProfileSettingsInput>(() => ({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    bio: user?.bio ?? user?.learningGoal ?? "",
    institution: user?.institution ?? "",
  }), [user?.bio, user?.email, user?.firstName, user?.institution, user?.lastName, user?.learningGoal]);
  const displayName = user?.fullName ?? "Learner";
  const displayEmail = user?.email ?? "";
  const avatarSeed = user?.id ?? user?.email ?? "guest";
  const nextBillingLabel = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString()
    : null;
  const currentPeriodStartLabel = subscription.currentPeriodStart
    ? new Date(subscription.currentPeriodStart).toLocaleDateString()
    : null;
  const currentPeriodEndLabel = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const profileSubmission = useAsyncFormSubmission();
  const notificationsSubmission = useAsyncFormSubmission();
  const securitySubmission = useAsyncFormSubmission();

  const profileForm = useForm<ProfileSettingsInput>({
    defaultValues: profileDefaults,
    mode: "onBlur",
  });

  useEffect(() => {
    profileForm.reset(profileDefaults);
  }, [profileDefaults, profileForm]);

  const notificationsForm = useForm<NotificationSettingsInput>({
    defaultValues: {
      courseUpdates: true,
      quizReminders: true,
      assignmentDeadlines: true,
      communityActivity: false,
      weeklyProgressReport: true,
      emailNotifications: true,
    },
  });

  const securityForm = useForm<SecuritySettingsInput>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const showPageSuccess = (message: string) => {
    setPageSuccessMessage(message);
    window.setTimeout(() => {
      setPageSuccessMessage(null);
    }, 2400);
  };

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    const result = await profileSubmission.run(async () => saveProfileSettings({
      firstName: normalizeRequiredTextInput(values.firstName),
      lastName: normalizeRequiredTextInput(values.lastName),
      email: normalizeEmailInput(values.email),
      bio: values.bio.trim(),
      institution: values.institution.trim(),
    }), {
      successMessage: "Profile updated successfully.",
      onSuccess: async (savedProfile) => {
        updateCurrentUserProfile({
          firstName: savedProfile.firstName,
          lastName: savedProfile.lastName,
          email: savedProfile.email,
          institution: savedProfile.institution,
          bio: savedProfile.bio,
        });
        profileForm.reset(savedProfile);
        showPageSuccess("Profile changes saved.");
      },
    });

    if (!result) {
      profileForm.setError("email", { message: "Review your profile details and try again." });
    }
  });

  const handleNotificationsSubmit = notificationsForm.handleSubmit(async (values) => {
    const result = await notificationsSubmission.run(async () => saveNotificationSettings(values), {
      successMessage: "Notification preferences updated.",
      onSuccess: async (savedPreferences) => {
        notificationsForm.reset(savedPreferences);
        showPageSuccess("Notification preferences saved.");
      },
    });

    if (!result) {
      notificationsForm.setError("emailNotifications", { message: "Could not save notification settings." });
    }
  });

  const handleSecuritySubmit = securityForm.handleSubmit(async (values) => {
    const result = await securitySubmission.run(async () => saveSecuritySettings(values), {
      successMessage: "Password updated successfully.",
      onSuccess: async () => {
        securityForm.reset();
        showPageSuccess("Security settings updated.");
      },
    });

    if (!result) {
      securityForm.setError("currentPassword", { message: "Check your current password and try again." });
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">Settings</h1>
        <p className="text-lg text-gray-700">Manage your account and preferences</p>
      </div>

      {pageSuccessMessage ? <ActionSuccessState message={pageSuccessMessage} className="mb-6" /> : null}

      <Tabs defaultValue="profile">
        <TabsList className="bg-white/[0.45] backdrop-blur-md mb-6">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <GlassCard>
            <div className="flex items-center gap-6 mb-8">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                alt="Profile"
                className="w-24 h-24 rounded-full"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{displayName}</h3>
                <p className="text-gray-600 mb-3">{displayEmail}</p>
                <Button variant="outline" className="bg-white/[0.45]">Change Avatar</Button>
              </div>
            </div>

            <Form {...profileForm}>
              <form className="space-y-6" onSubmit={handleProfileSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    rules={{
                      ...trimmedTextRules({
                        requiredMessage: "First name is required.",
                        minLength: 2,
                        minLengthMessage: "Enter your first name.",
                        maxLength: 60,
                        maxLengthMessage: "Keep first name under 60 characters.",
                      }),
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input className="bg-white/[0.45]" disabled={profileSubmission.isSubmitting} {...field} onChange={(event) => {
                            profileSubmission.clearStatus();
                            field.onChange(event);
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    rules={{
                      ...trimmedTextRules({
                        requiredMessage: "Last name is required.",
                        minLength: 2,
                        minLengthMessage: "Enter your last name.",
                        maxLength: 60,
                        maxLengthMessage: "Keep last name under 60 characters.",
                      }),
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input className="bg-white/[0.45]" disabled={profileSubmission.isSubmitting} {...field} onChange={(event) => {
                            profileSubmission.clearStatus();
                            field.onChange(event);
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="email"
                  rules={{
                    ...emailRules(),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" className="bg-white/[0.45]" disabled={profileSubmission.isSubmitting} {...field} onChange={(event) => {
                          profileSubmission.clearStatus();
                          field.onChange(event);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  rules={{
                    ...optionalTrimmedTextRules({
                      maxLength: 280,
                      maxLengthMessage: "Keep your bio under 280 characters.",
                    }),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-28 bg-white/[0.45]" disabled={profileSubmission.isSubmitting} {...field} onChange={(event) => {
                          profileSubmission.clearStatus();
                          field.onChange(event);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="institution"
                  rules={{
                    ...optionalTrimmedTextRules({
                      maxLength: 120,
                      maxLengthMessage: "Keep institution under 120 characters.",
                    }),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input className="bg-white/[0.45]" disabled={profileSubmission.isSubmitting} {...field} onChange={(event) => {
                          profileSubmission.clearStatus();
                          field.onChange(event);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {profileSubmission.submitError ? <DataErrorState title="Could not update profile" description={profileSubmission.submitError} /> : null}
                {profileSubmission.submitSuccess ? <ActionSuccessState message={profileSubmission.submitSuccess} /> : null}

                <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" type="submit" disabled={profileSubmission.isSubmitting}>
                  {profileSubmission.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notifications">
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Notification Preferences</h3>

            <Form {...notificationsForm}>
              <form className="space-y-6" onSubmit={handleNotificationsSubmit} noValidate>
                {[
                  ["courseUpdates", "Course Updates", "Get notified about new lessons and materials"],
                  ["quizReminders", "Quiz Reminders", "Receive reminders before quiz deadlines"],
                  ["assignmentDeadlines", "Assignment Deadlines", "Get notified about upcoming assignments"],
                  ["communityActivity", "Community Activity", "Notifications from discussions and groups"],
                  ["weeklyProgressReport", "Weekly Progress Report", "Receive a weekly summary of your progress"],
                  ["emailNotifications", "Email Notifications", "Receive notifications via email"],
                ].map(([name, title, description]) => (
                  <FormField
                    key={name}
                    control={notificationsForm.control}
                    name={name as keyof NotificationSettingsInput}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/50 bg-white/[0.35] px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{title}</p>
                          <p className="text-sm text-gray-600">{description}</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              notificationsSubmission.clearStatus();
                              field.onChange(checked);
                            }}
                            disabled={notificationsSubmission.isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}

                {notificationsSubmission.submitError ? <DataErrorState title="Could not update notifications" description={notificationsSubmission.submitError} /> : null}
                {notificationsSubmission.submitSuccess ? <ActionSuccessState message={notificationsSubmission.submitSuccess} /> : null}

                <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" type="submit" disabled={notificationsSubmission.isSubmitting}>
                  {notificationsSubmission.isSubmitting ? "Saving..." : "Save Preferences"}
                </Button>
              </form>
            </Form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="security">
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Security Settings</h3>

            <Form {...securityForm}>
              <form className="space-y-6" onSubmit={handleSecuritySubmit} noValidate>
                <FormField
                  control={securityForm.control}
                  name="currentPassword"
                  rules={{ ...passwordRules({ requiredMessage: "Enter your current password." }) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showCurrentPassword ? "text" : "password"} className="bg-white/[0.45] pr-10" disabled={securitySubmission.isSubmitting} {...field} onChange={(event) => {
                            securitySubmission.clearStatus();
                            field.onChange(event);
                          }} />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                            onClick={() => {
                              setShowCurrentPassword((previous) => !previous);
                            }}
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={securityForm.control}
                  name="newPassword"
                  rules={{
                    ...passwordRules({ requiredMessage: "Enter a new password." }),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showNewPassword ? "text" : "password"} className="bg-white/[0.45] pr-10" disabled={securitySubmission.isSubmitting} {...field} onChange={(event) => {
                            securitySubmission.clearStatus();
                            field.onChange(event);
                          }} />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                            onClick={() => {
                              setShowNewPassword((previous) => !previous);
                            }}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={securityForm.control}
                  name="confirmPassword"
                  rules={{
                    ...confirmPasswordRules(
                      () => securityForm.getValues("newPassword"),
                      {
                        requiredMessage: "Confirm your new password.",
                        mismatchMessage: "Passwords do not match.",
                      },
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showConfirmPassword ? "text" : "password"} className="bg-white/[0.45] pr-10" disabled={securitySubmission.isSubmitting} {...field} onChange={(event) => {
                            securitySubmission.clearStatus();
                            field.onChange(event);
                          }} />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            onClick={() => {
                              setShowConfirmPassword((previous) => !previous);
                            }}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {securitySubmission.submitError ? <DataErrorState title="Could not update password" description={securitySubmission.submitError} /> : null}
                {securitySubmission.submitSuccess ? <ActionSuccessState message={securitySubmission.submitSuccess} /> : null}

                <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" type="submit" disabled={securitySubmission.isSubmitting}>
                  {securitySubmission.isSubmitting ? "Updating..." : "Update Password"}
                </Button>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Session</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-700">Sign out from this device</p>
                    </div>
                    <Button
                      variant="outline"
                      className="bg-white/[0.45]"
                      type="button"
                      onClick={() => {
                        signOut();
                        navigate("/login", { replace: true });
                      }}
                    >
                      Log Out
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-700">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" className="bg-white/[0.45]" type="button">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="billing">
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Billing Information</h3>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#4a9ff5]/10 border border-[#4a9ff5]/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">Current Plan: {subscription.hasProAccess ? "Pro" : "Free"}</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscription.hasProAccess ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {formatStatusLabel(subscription.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  {subscription.hasProAccess
                    ? `$19.99 per ${subscription.billingCycle === "annual" ? "year" : "month"}${nextBillingLabel ? ` • Next billing ${nextBillingLabel}` : ""}`
                    : "$0 • Premium lessons remain locked until upgrade"}
                </p>
                {(currentPeriodStartLabel || currentPeriodEndLabel) ? (
                  <p className="text-xs text-gray-600 mb-3">
                    Current period: {currentPeriodStartLabel ?? "-"} to {currentPeriodEndLabel ?? "-"}
                  </p>
                ) : null}
                {subscription.status === "checkout-pending" || subscription.status === "verification-pending" ? (
                  <p className="text-xs text-amber-700 mb-3">
                    Your subscription is pending confirmation. Access unlocks only after verification succeeds.
                  </p>
                ) : null}
                <div className="flex gap-3">
                  {subscription.hasProAccess ? (
                    <Link to="/pricing">
                      <Button variant="outline" className="bg-white/[0.45]">Compare Plans</Button>
                    </Link>
                  ) : (
                    <Link to="/checkout?plan=pro&returnTo=%2Fsettings">
                      <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">Upgrade to Pro</Button>
                    </Link>
                  )}
                  <Button variant="outline" className="bg-white/[0.45]" disabled>
                    {subscription.hasProAccess ? "Billing Portal (Backend)" : "No Active Subscription"}
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Payment Method</h4>
                <div className="p-4 rounded-xl bg-white/[0.45] border border-white/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-600">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-white/[0.45]">Update</Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Billing History</h4>
                {subscription.hasProAccess ? (
                  <div className="space-y-3">
                    {[
                      { date: "Mar 1, 2026", amount: "$19.99", status: "Paid" },
                      { date: "Feb 1, 2026", amount: "$19.99", status: "Paid" },
                      { date: "Jan 1, 2026", amount: "$19.99", status: "Paid" },
                    ].map((invoice) => (
                      <div key={invoice.date} className="p-3 rounded-lg bg-white/[0.45] border border-white/50 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.date}</p>
                          <p className="text-sm text-gray-600">{invoice.amount}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            {invoice.status}
                          </span>
                          <Button variant="ghost" size="sm">Download</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No invoices yet. Upgrade to Pro to start billing history.</p>
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
