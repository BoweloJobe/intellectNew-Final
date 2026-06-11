import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDefaultPathForRole } from "../auth/route-utils";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { Brain, Sparkles, BarChart3, Users, Star } from "lucide-react";

export function LandingPage() {
  const features = [
    {
      icon: <Brain className="w-8 h-8 text-[#4a9ff5]" />,
      title: "AI-Powered Learning",
      description: "Personalized study plans powered by advanced AI that adapts to your learning style and pace."
    },
    {
      icon: <Sparkles className="w-8 h-8 text-[#4a9ff5]" />,
      title: "Smart Assessments",
      description: "Intelligent quizzes that identify knowledge gaps and provide targeted practice."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-[#4a9ff5]" />,
      title: "Progress Analytics",
      description: "Detailed insights into your learning journey with comprehensive progress tracking."
    },
    {
      icon: <Users className="w-8 h-8 text-[#4a9ff5]" />,
      title: "Collaborative Learning",
      description: "Connect with peers, join study groups, and learn together in our vibrant community."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Medical Student",
      content: "intellectX transformed how I study. The AI tutor is like having a personal mentor available 24/7.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Engineering Student",
      content: "The progress tracking and analytics helped me identify weak areas and improve my grades significantly.",
      rating: 5
    },
    {
      name: "Dr. Emily Roberts",
      role: "Instructor",
      content: "As an instructor, I love how intellectX helps me engage students and track their progress effectively.",
      rating: 5
    }
  ];

  const { isAuthenticated, role } = useAuth();
  const getStartedPath = isAuthenticated ? getDefaultPathForRole(role) : "/signup";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Hero Section */}
      <section className="text-center py-20">
        <GlassCard className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-semibold mb-6 text-gray-900">
            Master Your Studies with <span className="text-[#4a9ff5]">AI-Powered</span> Education
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
            Experience the future of learning with personalized AI tutoring, intelligent assessments, 
            and comprehensive progress tracking.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to={getStartedPath}>
              <Button size="lg" className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white px-8">
                Start Learning Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="font-semibold px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold mb-4 text-gray-900">
            Why Choose <span style={{fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>intellectX</span>?
          </h2>
          <p className="text-lg text-gray-700">
            Powerful features designed to accelerate your learning
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <GlassCard key={index} hover>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <GlassCard>
          <h2 className="text-4xl font-semibold mb-16 text-center text-gray-900">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#4a9ff5] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Sign Up</h3>
              <p className="text-sm text-gray-600">Create your account and set your learning goals</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#4a9ff5] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Learn</h3>
              <p className="text-sm text-gray-600">Access courses, quizzes, and AI-powered tutoring</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#4a9ff5] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Excel</h3>
              <p className="text-sm text-gray-600">Track progress and achieve your academic goals</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold mb-4 text-gray-900">
            What Our Users Say
          </h2>
          <p className="text-lg text-gray-700">
            Join thousands of successful students and educators
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <GlassCard key={index}>
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#4a9ff5] text-[#4a9ff5]" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-xs text-gray-500">{testimonial.role}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <GlassCard className="text-center">
          <h2 className="text-4xl font-semibold mb-4 text-gray-900">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Join <span style={{fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>intellectX</span> today and experience the future of education
          </p>
          <Link to={getStartedPath}>
            <Button size="lg" className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white px-12">
              Get Started Now
            </Button>
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}
